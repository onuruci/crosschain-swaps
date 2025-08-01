import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Paper,
  Alert,
  TextField,
  Collapse,
  CircularProgress
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Schedule as ScheduleIcon,
  Key as KeyIcon
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import { SwapStatus, WalletConnection } from '../types';
import { ethereumService } from '../services/ethereum';
import { aptosService } from '../services/aptos';
import { useGetSwapsQuery } from '../store/swapsApi';

interface SwapListProps {
  walletConnection: WalletConnection;
}

const SwapList: React.FC<SwapListProps> = ({ walletConnection }) => {
  const [loading, setLoading] = useState(false);
  const [secretInputs, setSecretInputs] = useState<{ [key: string]: string }>({});
  const [showSecretInputs, setShowSecretInputs] = useState<{ [key: string]: boolean }>({});

  const { data: swapsData, isLoading, refetch, error } = useGetSwapsQuery(undefined, {
    pollingInterval: 300000, // Poll every 300 seconds
    refetchOnMountOrArgChange: true, // Ensure it refetches on mount
  });
  const pendingSwaps = swapsData?.pending || [];
  const completedSwaps = swapsData?.completed || [];

  // Debug logging
  console.log('🔄 SwapList render:', {
    isLoading,
    hasData: !!swapsData,
    pendingCount: pendingSwaps.length,
    completedCount: completedSwaps.length,
    error: error ? (error as any).error : null
  });

  // Force initial fetch on mount
  useEffect(() => {
    console.log('🔄 SwapList mounted, triggering initial fetch...');
    refetch();
  }, [refetch]);

  const getSecretForHashlock = (hashlock: string): string | null => {
    const completedSwap = completedSwaps.find(swap => swap.hashlock === hashlock && swap.secret);
    return completedSwap?.secret || null;
  };

  

  const toggleSecretInput = (swap: SwapStatus) => {
    const swapKey = `${swap.hashlock}-${swap.fromChain}`;
    setShowSecretInputs(prev => ({ ...prev, [swapKey]: !prev[swapKey] }));
    
    if (showSecretInputs[swapKey]) {
      setSecretInputs(prev => ({ ...prev, [swapKey]: '' }));
    }
  };

  const updateSecretInput = (swap: SwapStatus, value: string) => {
    const swapKey = `${swap.hashlock}-${swap.fromChain}`;
    setSecretInputs(prev => ({ ...prev, [swapKey]: value }));
  };

  const refundSwap = async (swap: SwapStatus) => {
    setLoading(true);
    try {
      // Wallet connection checks
      if (swap.fromChain === 'ethereum' && !walletConnection.ethereum.connected) {
        toast.error('Please connect your Ethereum wallet to refund this swap');
        return;
      }
      if (swap.fromChain === 'aptos' && !walletConnection.aptos.connected) {
        toast.error('Please connect your Aptos wallet to refund this swap');
        return;
      }

      // Pre-refund validation checks
      if (swap.fromChain === 'ethereum') {
        const contract = ethereumService.contract;
        if (!contract) {
          toast.error('Ethereum contract not available');
          return;
        }

        console.log('🔍 Pre-refund validation for hashlock:', swap.hashlock.substring(0, 16) + '...');

        // Check if swap exists
        try {
          const swapData = await contract.getSwap(swap.hashlock);
          if (!swapData || swapData[0] === '0x0000000000000000000000000000000000000000') {
            toast.error('Swap not found with this hashlock');
            return;
          }
          console.log('✅ Swap exists:', swapData);
        } catch (error) {
          console.error('Error checking swap existence:', error);
          toast.error('Failed to verify swap exists');
          return;
        }

        try {
          const currentTime = Math.floor(Date.now() / 1000);
          const swapData = await contract.getSwap(swap.hashlock);
          const timelock = typeof swapData[4] === 'object' && swapData[4].toNumber ? 
            swapData[4].toNumber() : Number(swapData[4]);
          
          console.log('⏰ Timelock check:', {
            currentTime,
            timelock,
            timeRemaining: timelock - currentTime,
            isExpired: currentTime >= timelock
          });

          if (currentTime < timelock) {
            const remainingHours = Math.floor((timelock - currentTime) / 3600);
            const remainingMinutes = Math.floor(((timelock - currentTime) % 3600) / 60);
            toast.error(`Timelock not expired yet. Wait ${remainingHours}h ${remainingMinutes}m more.`);
            return;
          }
          console.log('✅ Timelock has expired');
        } catch (error) {
          console.error('Error checking timelock:', error);
          toast.error('Failed to verify timelock status');
          return;
        }

        // All checks passed, proceed with refund
        console.log('🚀 All pre-refund checks passed, proceeding with refund...');
        await ethereumService.refundSwap(swap.hashlock);
      } else {
        // Aptos refund with validation
        try {
          const swapData = await aptosService.getSwap(swap.hashlock);
          if (!swapData || swapData.initiator === '0x0') {
            toast.error('Swap not found with this hashlock');
            return;
          }

          if (swapData.completed) {
            toast.error('Swap is already completed');
            return;
          }

          if (swapData.refunded) {
            toast.error('Swap is already refunded');
            return;
          }

          const currentTime = Math.floor(Date.now() / 1000);
          const timelock = Number(swapData.timelock);
          
          if (currentTime < timelock) {
            const remainingHours = Math.floor((timelock - currentTime) / 3600);
            const remainingMinutes = Math.floor(((timelock - currentTime) % 3600) / 60);
            toast.error(`Timelock not expired yet. Wait ${remainingHours}h ${remainingMinutes}m more.`);
            return;
          }

          console.log('🚀 All Aptos pre-refund checks passed, proceeding with refund...');
          await aptosService.refundSwap(swap.hashlock);
        } catch (error) {
          console.error('Error validating Aptos swap:', error);
          toast.error('Failed to validate swap before refund');
          return;
        }
      }

      toast.success('Swap refunded successfully!');
      refetch();
    } catch (error) {
      console.error('Failed to refund swap:', error);
      
      // Enhanced error handling for custom contract errors
      if (error instanceof Error) {
        if (error.message.includes('0x621e25c3')) {
          toast.error('Swap refund failed: Invalid refund conditions (swap may not exist, already refunded, or timelock not expired)');
        } else if (error.message.includes('user rejected')) {
          toast.error('Transaction was rejected by user');
        } else if (error.message.includes('SwapNotFound')) {
          toast.error('Swap not found with this hashlock');
        } else if (error.message.includes('SwapAlreadyRefunded')) {
          toast.error('Swap is already refunded');
        } else if (error.message.includes('TimelockNotExpired')) {
          toast.error('Timelock has not expired yet');
        } else {
          toast.error('Failed to refund swap: ' + error.message);
        }
      } else {
        toast.error('Failed to refund swap: Unknown error');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const getTimeRemaining = (timelock: number) => {
    const now = Math.floor(Date.now() / 1000);
    const remaining = timelock - now;
    if (remaining <= 0) return 'Expired';
    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getStatusColor = (swap: SwapStatus) => {
    if (swap.completed) return 'success';
    if (swap.refunded) return 'error';
    return 'warning';
  };

  const getStatusIcon = (swap: SwapStatus) => {
    if (swap.completed) return <CheckIcon />;
    if (swap.refunded) return <CancelIcon />;
    return <ScheduleIcon />;
  };

  const renderSwapItem = (swap: SwapStatus, isPending: boolean = true) => {
    const secret = getSecretForHashlock(swap.hashlock);
    const showCompleteButton = isPending && secret;
    const swapKey = `${swap.hashlock}-${swap.fromChain}`;

    return (
      <Card key={swapKey} elevation={2} sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="body2" fontFamily="monospace" sx={{ mr: 2 }}>
                {swap.hashlock.substring(0, 16)}...
              </Typography>
              <Chip
                icon={getStatusIcon(swap)}
                label={swap.completed ? 'Completed' : swap.refunded ? 'Refunded' : 'Pending'}
                color={getStatusColor(swap) as any}
                size="small"
              />
              {isPending && secret && (
                <Chip
                  icon={<KeyIcon />}
                  label="Secret Available"
                  color="success"
                  size="small"
                  sx={{ ml: 1 }}
                />
              )}
            </Box>
          </Box>

                     <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2, mb: 2 }}>
             <Typography variant="body2" color="text.secondary">
               From: {swap.fromChain} ({formatAddress(swap.initiator)})
             </Typography>
             <Typography variant="body2" color="text.secondary">
               To: {swap.toChain} ({formatAddress(swap.recipient)})
             </Typography>
             <Typography variant="body2" color="text.secondary">
               Amount: {swap.amount}
             </Typography>
             <Typography variant="body2" color="text.secondary">
               Created: {formatTime(swap.createdAt)}
             </Typography>
             {isPending && (
               <Typography variant="body2" color="text.secondary">
                 Expires: {formatTime(swap.timelock)} ({getTimeRemaining(swap.timelock)})
               </Typography>
             )}
             {isPending && !secret && (
               <Alert severity="info" sx={{ py: 0 }}>
                 <Typography variant="body2">
                   ⏳ Waiting for secret from other chain
                 </Typography>
               </Alert>
             )}
           </Box>
        </CardContent>
      </Card>
    );
  };

  return (
    <Card elevation={3} sx={{ maxWidth: 1200, mx: 'auto', mb: 4 }}>
      <CardContent sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h2" fontWeight="bold">
            Atomic Swaps
          </Typography>
          <Button
            startIcon={isLoading ? <CircularProgress size={16} /> : <RefreshIcon />}
            onClick={() => refetch()}
            disabled={isLoading}
            variant="outlined"
          >
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </Box>

                 <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
           {/* Pending Swaps */}
           <Paper elevation={1} sx={{ p: 3 }}>
             <Typography variant="h6" gutterBottom>
               Pending Swaps ({pendingSwaps.length})
             </Typography>
             {pendingSwaps.length === 0 ? (
               <Alert severity="info">
                 <Typography variant="body2">No pending swaps</Typography>
               </Alert>
             ) : (
               <Box>
                 {pendingSwaps.map(swap => renderSwapItem(swap, true))}
               </Box>
             )}
           </Paper>

           {/* Completed Swaps */}
           <Paper elevation={1} sx={{ p: 3 }}>
             <Typography variant="h6" gutterBottom>
               Completed Swaps ({completedSwaps.length})
             </Typography>
             {completedSwaps.length === 0 ? (
               <Alert severity="info">
                 <Typography variant="body2">No completed swaps</Typography>
               </Alert>
             ) : (
               <Box>
                 {completedSwaps.map(swap => renderSwapItem(swap, false))}
               </Box>
             )}
           </Paper>
         </Box>
      </CardContent>
    </Card>
  );
};

export default SwapList; 