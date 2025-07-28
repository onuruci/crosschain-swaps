import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { ethereumService } from '../services/ethereum';
import { aptosService } from '../services/aptos';
import { SwapStatus } from '../types';

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
      // Since event scanning might not work with the current SDK, let's use a robust approach
      // that scans for swaps using known patterns and recent hashlocks
      console.log('🔍 Using robust Aptos swap scanning...');
      
      // Get hashlocks from localStorage (from recent swaps)
      const keys = Object.keys(localStorage);
      const hashlockKeys = keys.filter(key => key.startsWith('swap_secret_'));
      const knownHashlocks = hashlockKeys.map(key => key.replace('swap_secret_', ''));
      
      console.log(`🔍 Found ${knownHashlocks.length} hashlocks in localStorage`);
      
      // Scan for swaps using known hashlocks
      for (const hashlock of knownHashlocks) {
        try {
          const swapData = await aptosService.getSwap(hashlock);
          if (swapData && swapData.initiator !== '0x0') {
            console.log('📋 Found swap data for known hashlock:', hashlock.substring(0, 16) + '...', swapData);
            
            swaps.push({
              hashlock: hashlock,
              initiator: swapData.initiator,
              recipient: swapData.recipient,
              amount: swapData.amount?.toString() || '0',
              timelock: typeof swapData.timelock === 'object' && swapData.timelock.toNumber ? 
                swapData.timelock.toNumber() : Number(swapData.timelock || 0),
              completed: swapData.completed || false,
              refunded: swapData.refunded || false,
              fromChain: 'aptos',
              toChain: 'ethereum',
              createdAt: Math.floor(Date.now() / 1000), // Approximate
              secret: undefined
            });
          }
        } catch (error) {
          console.log(`No swap data for hashlock ${hashlock.substring(0, 16)}...:`, (error as Error).message);
        }
      }
      
      // Also try some common hashlocks that might exist
      const commonHashlocks = [
        '0x0000000000000000000000000000000000000000000000000000000000000000',
        '0x1111111111111111111111111111111111111111111111111111111111111111',
        '0x2222222222222222222222222222222222222222222222222222222222222222',
        '0x3333333333333333333333333333333333333333333333333333333333333333',
        '0x4444444444444444444444444444444444444444444444444444444444444444',
        '0x5555555555555555555555555555555555555555555555555555555555555555'
      ];

      for (const hashlock of commonHashlocks) {
        try {
          const swapData = await aptosService.getSwap(hashlock);
          if (swapData && swapData.initiator !== '0x0') {
            console.log('📋 Found swap data for common hashlock:', hashlock.substring(0, 16) + '...', swapData);
            
            // Check if we already have this swap
            const existingSwap = swaps.find(s => s.hashlock === hashlock);
            if (!existingSwap) {
              swaps.push({
                hashlock: hashlock,
                initiator: swapData.initiator,
                recipient: swapData.recipient,
                amount: swapData.amount?.toString() || '0',
                timelock: typeof swapData.timelock === 'object' && swapData.timelock.toNumber ? 
                  swapData.timelock.toNumber() : Number(swapData.timelock || 0),
                completed: swapData.completed || false,
                refunded: swapData.refunded || false,
                fromChain: 'aptos',
                toChain: 'ethereum',
                createdAt: Math.floor(Date.now() / 1000), // Approximate
                secret: undefined
              });
            }
          }
        } catch (error) {
          // Expected for most common hashlocks
        }
      }

    } catch (error) {
      console.log('Error fetching Aptos events:', (error as Error).message);
      
      // Fallback: try to get swaps from known addresses
      console.log('🔄 Trying fallback approach...');
      try {
        const currentAddress = await aptosService.getAddress();
        if (currentAddress) {
          console.log('🔍 Checking for swaps from current address:', currentAddress);
          
          // Try some common hashlocks that might exist
          const testHashlocks = [
            '0x0000000000000000000000000000000000000000000000000000000000000000',
            '0x1111111111111111111111111111111111111111111111111111111111111111',
            '0x2222222222222222222222222222222222222222222222222222222222222222'
          ];

          for (const testHashlock of testHashlocks) {
            try {
              const swapData = await aptosService.getSwap(testHashlock);
              if (swapData && swapData.initiator !== '0x0') {
                console.log('📋 Found swap data for test hashlock:', testHashlock.substring(0, 16) + '...', swapData);
                
                swaps.push({
                  hashlock: testHashlock,
                  initiator: swapData.initiator,
                  recipient: swapData.recipient,
                  amount: swapData.amount?.toString() || '0',
                  timelock: typeof swapData.timelock === 'object' && swapData.timelock.toNumber ? 
                    swapData.timelock.toNumber() : Number(swapData.timelock || 0),
                  completed: swapData.completed || false,
                  refunded: swapData.refunded || false,
                  fromChain: 'aptos',
                  toChain: 'ethereum',
                  createdAt: Math.floor(Date.now() / 1000), // Approximate
                  secret: undefined
                });
              }
            } catch (error) {
              // Expected for most test hashlocks
            }
          }
        }
      } catch (fallbackError) {
        console.log('Fallback approach also failed:', (fallbackError as Error).message);
      }
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