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
    pollingInterval: 10000, // Poll every 5 seconds
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

  const completeSwap = async (swap: SwapStatus, secret: string) => {
    setLoading(true);
    try {
      const targetChain = swap.fromChain;
      
      if (targetChain === 'ethereum' && !walletConnection.ethereum.connected) {
        toast.error('Please connect your Ethereum wallet to complete this swap');
        return;
      }
      if (targetChain === 'aptos' && !walletConnection.aptos.connected) {
        toast.error('Please connect your Aptos wallet to complete this swap');
        return;
      }

      if (targetChain === 'ethereum') {
        try {
          await ethereumService.completeSwap(swap.hashlock, secret);
        } catch (error) {
          if (error instanceof Error && error.message.includes('InvalidRecipient')) {
            await ethereumService.completeSwapAsInitiator(swap.hashlock, secret);
          } else {
            throw error;
          }
        }
      } else {
        await aptosService.completeSwap(swap.initiator, swap.hashlock, secret);
      }

      toast.success('Swap completed successfully!');
      refetch();
    } catch (error) {
      console.error('Failed to complete swap:', error);
      toast.error('Failed to complete swap: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteWithSecret = async (swap: SwapStatus) => {
    const swapKey = `${swap.hashlock}-${swap.fromChain}`;
    const secret = secretInputs[swapKey]?.trim();
    
    if (!secret) {
      toast.error('Please enter a secret');
      return;
    }

    if (!secret.startsWith('0x') || secret.length !== 66) {
      toast.error('Invalid secret format. Should be 0x followed by 64 hex characters');
      return;
    }

    await completeSwap(swap, secret);
    
    setSecretInputs(prev => ({ ...prev, [swapKey]: '' }));
    setShowSecretInputs(prev => ({ ...prev, [swapKey]: false }));
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
      if (swap.fromChain === 'ethereum' && !walletConnection.ethereum.connected) {
        toast.error('Please connect your Ethereum wallet to refund this swap');
        return;
      }
      if (swap.fromChain === 'aptos' && !walletConnection.aptos.connected) {
        toast.error('Please connect your Aptos wallet to refund this swap');
        return;
      }

      if (swap.fromChain === 'ethereum') {
        await ethereumService.refundSwap(swap.hashlock);
      } else {
        await aptosService.refundSwap(swap.hashlock);
      }

      toast.success('Swap refunded successfully!');
      refetch();
    } catch (error) {
      console.error('Failed to refund swap:', error);
      toast.error('Failed to refund swap: ' + (error as Error).message);
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

          {isPending && !swap.completed && !swap.refunded && (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {showCompleteButton && (
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<CheckIcon />}
                  onClick={() => completeSwap(swap, secret!)}
                  disabled={loading}
                  size="small"
                >
                  Complete Swap
                </Button>
              )}
              
              <Button
                variant="outlined"
                startIcon={<KeyIcon />}
                onClick={() => toggleSecretInput(swap)}
                disabled={loading}
                size="small"
              >
                {showSecretInputs[swapKey] ? 'Cancel' : 'Complete with Secret'}
              </Button>
              
              <Button
                variant="outlined"
                color="error"
                startIcon={<CancelIcon />}
                onClick={() => refundSwap(swap)}
                disabled={loading}
                size="small"
              >
                Refund Swap
              </Button>
            </Box>
          )}

          <Collapse in={showSecretInputs[swapKey]}>
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <TextField
                fullWidth
                label="Secret"
                placeholder="0x followed by 64 hex characters"
                value={secretInputs[swapKey] || ''}
                onChange={(e) => updateSecretInput(swap, e.target.value)}
                disabled={loading}
                size="small"
                sx={{ mb: 1 }}
              />
              <Button
                variant="contained"
                onClick={() => handleCompleteWithSecret(swap)}
                disabled={loading || !secretInputs[swapKey]?.trim()}
                size="small"
              >
                {loading ? 'Completing...' : 'Submit Secret'}
              </Button>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                💡 Enter the secret that corresponds to this hashlock to complete the swap
              </Typography>
            </Box>
          </Collapse>
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