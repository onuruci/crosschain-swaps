import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { ethereumService } from '../services/ethereum';
import { aptosService } from '../services/aptos';
import { SwapStatus } from '../types';
import { config } from '../config';

// Helper function to get all swaps from Ethereum
const getEthereumSwaps = async (): Promise<SwapStatus[]> => {
  const swaps: SwapStatus[] = [];
  
  try {
    console.log('🔍 Starting Ethereum swap fetch...');
    
    // Get recent events to find hashlocks
    const contract = ethereumService.contract;
    if (!contract) {
      console.log('❌ Ethereum contract not available');
      return swaps;
    }

    // Get SwapInitiated events from the last 1000 blocks
    const provider = ethereumService.providerInstance;
    if (!provider) return swaps;
    
    const currentBlock = await provider.getBlockNumber();
    const fromBlock = Math.max(0, currentBlock - 1000);
    
    const events = await contract.queryFilter(
      contract.filters.SwapInitiated(),
      fromBlock,
      currentBlock
    );

    console.log(`📡 Found ${events.length} Ethereum SwapInitiated events`);

    for (const event of events) {
      try {
        // Check if it's an EventLog with args
        if ('args' in event && event.args) {
          const hashlock = event.args.hashlock;
          if (!hashlock) continue;

          const swapData = await contract.getSwap(hashlock);
          if (!swapData) continue;

          console.log('📋 Swap data from contract:', {
            hashlock: hashlock.substring(0, 16) + '...',
            swapData: swapData,
            timelockType: typeof swapData[4],
            timelockValue: swapData[4]
          });

          const [initiator, recipient, , amount, timelock, completed, refunded] = swapData;

          swaps.push({
            hashlock: hashlock,
            initiator: initiator,
            recipient: recipient,
            amount: amount.toString(),
            timelock: typeof timelock === 'object' && timelock.toNumber ? timelock.toNumber() : Number(timelock),
            completed: completed,
            refunded: refunded,
            fromChain: 'ethereum',
            toChain: 'aptos',
            createdAt: Math.floor(Date.now() / 1000), // Approximate
            secret: undefined
          });
        }
      } catch (error) {
        console.error('Error processing Ethereum swap event:', error);
      }
    }

    // Also check for completed and refunded events
    try {
      console.log('📡 Fetching Ethereum completed and refunded events...');
      
      const completedEvents = await contract.queryFilter(
        contract.filters.SwapCompleted(),
        fromBlock,
        currentBlock
      );

      const refundedEvents = await contract.queryFilter(
        contract.filters.SwapRefunded(),
        fromBlock,
        currentBlock
      );

      console.log(`📡 Found ${completedEvents.length} Ethereum SwapCompleted events`);
      console.log(`📡 Found ${refundedEvents.length} Ethereum SwapRefunded events`);

      // Update swap statuses based on completed/refunded events
      for (const event of [...completedEvents, ...refundedEvents]) {
        try {
          if ('args' in event && event.args && typeof event.args === 'object' && 'hashlock' in event.args) {
            const hashlock = event.args.hashlock as string;
            if (!hashlock) continue;

            const existingSwap = swaps.find(s => s.hashlock === hashlock);
            if (existingSwap) {
              // Check if this event is from completedEvents or refundedEvents arrays
              const isCompletedEvent = completedEvents.includes(event);
              const isRefundedEvent = refundedEvents.includes(event);
              
              if (isCompletedEvent) {
                existingSwap.completed = true;
                console.log(`✅ Updated Ethereum swap ${hashlock.substring(0, 16)}... to completed`);
              } else if (isRefundedEvent) {
                existingSwap.refunded = true;
                console.log(`🔄 Updated Ethereum swap ${hashlock.substring(0, 16)}... to refunded`);
              }
            }
          }
        } catch (error) {
          console.error('Error processing Ethereum completed/refunded event:', error);
        }
      }
    } catch (error) {
      console.log('Error fetching Ethereum completed/refunded events:', (error as Error).message);
    }

    console.log(`📝 Ethereum swaps found: ${swaps.length}`);
    return swaps;
  } catch (error) {
    console.error('Error fetching Ethereum swaps:', error);
  }

  console.log(`📝 Ethereum swaps found: ${swaps.length}`);
  return swaps;
};

// Helper function to get all swaps from Aptos
const getAptosSwaps = async (): Promise<SwapStatus[]> => {
  const swaps: SwapStatus[] = [];
  
  try {
    const aptos = aptosService.aptosInstance;
    if (!aptos) {
      console.log('Aptos client not connected');
      return swaps;
    }

    console.log('🔍 Fetching Aptos swaps from events...');
    
    try {
      // Get recent events to find hashlocks (pure event-based approach)
      const contractAddress = aptosService.contractAddressInstance;
      const moduleName = aptosService.moduleNameInstance;
      
      console.log('📡 Fetching Aptos events from contract:', `${contractAddress}::${moduleName}`);
      
      // Get SwapInitiated events using the correct Aptos SDK method
      try {
        console.log('📡 Fetching Aptos events using SDK...');
        
        // Use the Aptos SDK event methods to get events from the contract
        const eventType = `${contractAddress}::${moduleName}::SwapInitiatedEvent` as const;
        
        console.log('🔍 All Events:', await aptos.event.getEvents());
        // Get events by event type using the SDK
        const events = await aptos.event.getModuleEventsByEventType({
          eventType: eventType,
          options: {
            limit: 100
          }
        });

        console.log(`📡 Found ${events.length} Aptos SwapInitiated events: `, events);

        // Process each event to get the hashlock and fetch swap details
        for (const event of events) {
          try {
            // Extract hashlock from event data
            let hashlock: string;
            if (typeof event.data.hashlock === 'string') {
              hashlock = event.data.hashlock;
            } else if (Array.isArray(event.data.hashlock)) {
              // Convert byte array to hex string
              hashlock = '0x' + Buffer.from(event.data.hashlock).toString('hex');
            } else {
              console.log('Unknown hashlock format:', event.data.hashlock);
              continue;
            }

            console.log('🔍 Processing event with hashlock:', hashlock.substring(0, 16) + '...');

            // Get detailed swap information using the hashlock
            const swapData = await aptosService.getSwap(hashlock);
            if (!swapData) {
              console.log(`No swap data found for hashlock: ${hashlock.substring(0, 16)}...`);
              continue;
            }

            console.log('📋 Aptos swap data:', {
              hashlock: hashlock.substring(0, 16) + '...',
              initiator: event.data.initiator,
              recipient: event.data.recipient,
              amount: event.data.amount,
              timelock: event.data.timelock
            });

            swaps.push({
              hashlock: hashlock,
              initiator: event.data.initiator,
              recipient: event.data.recipient,
              amount: event.data.amount.toString(),
              timelock: typeof event.data.timelock === 'object' && event.data.timelock.toNumber ? 
                event.data.timelock.toNumber() : Number(event.data.timelock),
              completed: swapData.completed || false,
              refunded: swapData.refunded || false,
              fromChain: 'aptos',
              toChain: 'ethereum',
              createdAt: Math.floor(Date.now() / 1000), // Approximate
              secret: undefined
            });
          } catch (error) {
            console.error('Error processing Aptos swap event:', error);
          }
        }

        // Also check for completed and refunded events
        try {
          const completedEventType = `${contractAddress}::${moduleName}::SwapCompletedEvent` as const;
          const completedEvents = await aptos.event.getModuleEventsByEventType({
            eventType: completedEventType,
            options: {
              limit: 50
            }
          });

          const refundedEventType = `${contractAddress}::${moduleName}::SwapRefundedEvent` as const;
          const refundedEvents = await aptos.event.getModuleEventsByEventType({
            eventType: refundedEventType,
            options: {
              limit: 50
            }
          });

          console.log(`📡 Found ${completedEvents.length} Aptos SwapCompleted events`);
          console.log(`📡 Found ${refundedEvents.length} Aptos SwapRefunded events`);

          // Update swap statuses based on completed/refunded events
          for (const event of [...completedEvents, ...refundedEvents]) {
            let hashlock: string;
            if (typeof event.data.hashlock === 'string') {
              hashlock = event.data.hashlock;
            } else if (Array.isArray(event.data.hashlock)) {
              hashlock = '0x' + Buffer.from(event.data.hashlock).toString('hex');
            } else {
              continue;
            }

            const existingSwap = swaps.find(s => s.hashlock === hashlock);
            if (existingSwap) {
              if (event.type.includes('SwapCompleted')) {
                existingSwap.completed = true;
                console.log(`✅ Updated swap ${hashlock.substring(0, 16)}... to completed`);
              } else if (event.type.includes('SwapRefunded')) {
                existingSwap.refunded = true;
                console.log(`🔄 Updated swap ${hashlock.substring(0, 16)}... to refunded`);
              }
            }
          }
        } catch (error) {
          console.log('Error fetching completed/refunded events:', (error as Error).message);
        }

      } catch (eventError) {
        console.log('Error fetching Aptos events:', (eventError as Error).message);
        console.log('🔄 Event-based approach failed, no swaps found');
      }
    } catch (error) {
      console.log('Error in Aptos swap fetching:', (error as Error).message);
    }
  } catch (error) {
    console.error('Error fetching Aptos swaps:', (error as Error).message);
  }

  console.log(`📝 Found ${swaps.length} Aptos swaps`);
  return swaps;
};

export const swapsApi = createApi({
  reducerPath: 'swapsApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/' }),
  tagTypes: ['Swap'],
  endpoints: (builder) => ({
    getSwaps: builder.query<{ pending: SwapStatus[], completed: SwapStatus[] }, void>({
      queryFn: async () => {
        console.log('🚀 RTK Query: Starting swap fetch...');
        try {
          const [ethereumSwaps, aptosSwaps] = await Promise.all([
            getEthereumSwaps(),
            getAptosSwaps()
          ]);

          const allSwaps = [...ethereumSwaps, ...aptosSwaps];
          
          const pending = allSwaps.filter(swap => !swap.completed && !swap.refunded);
          const completed = allSwaps.filter(swap => swap.completed || swap.refunded);

          console.log('✅ RTK Query: Fetch completed:', {
            total: allSwaps.length,
            pending: pending.length,
            completed: completed.length,
            ethereum: ethereumSwaps.length,
            aptos: aptosSwaps.length
          });

          return { data: { pending, completed } };
        } catch (error) {
          console.error('❌ RTK Query: Fetch failed:', error);
          return { error: { status: 'CUSTOM_ERROR', error: 'Failed to fetch swaps' } };
        }
      },
      providesTags: ['Swap'],
    }),
  }),
});

export const { useGetSwapsQuery } = swapsApi; 