import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Paper,
  Alert,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import {
  Refresh as RefreshIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Schedule as ScheduleIcon,
  Key as KeyIcon,
} from "@mui/icons-material";
import { SwapStatus, WalletConnection } from "../types";
import { useGetSwapsQuery } from "../store/swapsApi";

interface SwapListProps {
  walletConnection: WalletConnection;
}

// Utility function to convert wei to ETH
const weiToEth = (wei: string): string => {
  const weiNumber = BigInt(wei);
  const ethNumber = Number(weiNumber) / Math.pow(10, 18);
  return ethNumber.toFixed(6);
};

// Utility function to convert octas to APT
const octasToApt = (octas: string): string => {
  const octasNumber = BigInt(octas);
  const aptNumber = Number(octasNumber) / Math.pow(10, 8);
  return aptNumber.toFixed(6);
};

// Utility function to format amount based on chain
const formatAmount = (amount: string, chain: 'ethereum' | 'aptos'): string => {
  try {
    if (chain === 'ethereum') {
      const ethAmount = weiToEth(amount);
      // Remove trailing zeros and format nicely
      const cleanAmount = parseFloat(ethAmount).toString();
      return `${cleanAmount} ETH`;
    } else if (chain === 'aptos') {
      const aptAmount = octasToApt(amount);
      // Remove trailing zeros and format nicely
      const cleanAmount = parseFloat(aptAmount).toString();
      return `${cleanAmount} APT`;
    }
    return `${amount} (unknown unit)`;
  } catch (error) {
    console.error('Error formatting amount:', error);
    return `${amount} (error)`;
  }
};

const SwapList: React.FC<SwapListProps> = ({ walletConnection }) => {
  const {
    data: swapsData,
    isLoading,
    refetch,
    error,
  } = useGetSwapsQuery(undefined, {
    pollingInterval: 300000, // Poll every 300 seconds
    refetchOnMountOrArgChange: true, // Ensure it refetches on mount
  });
  const pendingSwaps = swapsData?.pending || [];
  const completedSwaps = swapsData?.completed || [];

  // Debug logging
  console.log("🔄 SwapList render:", {
    isLoading,
    hasData: !!swapsData,
    pendingCount: pendingSwaps.length,
    completedCount: completedSwaps.length,
    error: error ? (error as any).error : null,
  });

  // Force initial fetch on mount
  useEffect(() => {
    console.log("🔄 SwapList mounted, triggering initial fetch...");
    refetch();
  }, [refetch]);

  const getSecretForHashlock = (hashlock: string): string | null => {
    const completedSwap = completedSwaps.find(
      (swap) => swap.hashlock === hashlock && swap.secret
    );
    return completedSwap?.secret || null;
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const getTimeRemaining = (timelock: number) => {
    const now = Math.floor(Date.now() / 1000);
    const remaining = timelock - now;
    if (remaining <= 0) return "Expired";
    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const getStatusColor = (swap: SwapStatus) => {
    if (swap.completed) return "success";
    if (swap.refunded) return "error";
    return "warning";
  };

  const getStatusIcon = (swap: SwapStatus) => {
    if (swap.completed) return <CheckIcon />;
    if (swap.refunded) return <CancelIcon />;
    return <ScheduleIcon />;
  };

  const renderSwapItem = (swap: SwapStatus, isPending: boolean = true) => {
    const secret = getSecretForHashlock(swap.hashlock);
    const swapKey = `${swap.hashlock}-${swap.fromChain}`;

    return (
      <Card key={swapKey} elevation={2} sx={{ mb: 2 }}>
        <CardContent>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Tooltip title={swap.hashlock} placement="top">
              <Typography 
                variant="body2" 
                fontFamily="monospace"
                sx={{ 
                  cursor: 'pointer',
                  '&:hover': {
                    textDecoration: 'underline',
                    opacity: 0.8
                  }
                }}
              >
                {swap.hashlock.substring(0, 16)}...
              </Typography>
            </Tooltip>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Chip
                icon={getStatusIcon(swap)}
                label={
                  swap.completed
                    ? "Completed"
                    : swap.refunded
                    ? "Refunded"
                    : "Pending"
                }
                color={getStatusColor(swap) as any}
                size="small"
              />
              {isPending && secret && (
                <Chip
                  icon={<KeyIcon />}
                  label="Secret Available"
                  color="success"
                  size="small"
                />
              )}
            </Box>
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
              gap: 2,
              mb: 2,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Amount: {formatAmount(swap.amount, swap.fromChain)}
            </Typography>
            {isPending && (
              <Typography variant="body2" color="text.secondary">
                Expires: {formatTime(swap.timelock)} (
                {getTimeRemaining(swap.timelock)})
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
    <Card elevation={3} sx={{ maxWidth: 1200, mx: "auto", mb: 4 }}>
      <CardContent sx={{ p: 4 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
          }}
        >
          <Typography variant="h4" component="h2" fontWeight="bold">
            Atomic Swaps
          </Typography>
          <Button
            startIcon={
              isLoading ? <CircularProgress size={16} /> : <RefreshIcon />
            }
            onClick={() => refetch()}
            disabled={isLoading}
            variant="outlined"
          >
            {isLoading ? "Refreshing..." : "Refresh"}
          </Button>
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            gap: 3,
          }}
        >
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
                {pendingSwaps.map((swap) => renderSwapItem(swap, true))}
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
                {completedSwaps.map((swap) => renderSwapItem(swap, false))}
              </Box>
            )}
          </Paper>
        </Box>
      </CardContent>
    </Card>
  );
};

export default SwapList;
