import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  ThemeProvider,
  createTheme,
  CssBaseline
} from '@mui/material';
import {
  SwapHoriz as SwapIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { Toaster } from 'react-hot-toast';
import WalletConnector from './components/WalletConnector';
import SwapForm from './components/SwapForm';
import SwapList from './components/SwapList';
import { WalletConnection, RelayerStatus } from './types';
import { relayerService } from './services/relayer';

// Create a custom theme
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    h1: {
      fontWeight: 700,
    },
    h2: {
      fontWeight: 600,
    },
    h3: {
      fontWeight: 600,
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
  },
});

function App() {
  const [walletConnection, setWalletConnection] = useState<WalletConnection>({
    ethereum: { connected: false },
    aptos: { connected: false }
  });
  const [relayerStatus, setRelayerStatus] = useState<RelayerStatus | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkRelayerStatus();
    const interval = setInterval(checkRelayerStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const checkRelayerStatus = async () => {
    try {
      const status = await relayerService.getStatus();
      setRelayerStatus(status);
    } catch (error) {
      console.error('Failed to get relayer status:', error);
      setRelayerStatus(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSwapInitiated = (hashlock: string) => {
    // Swap initiated successfully
    console.log('Swap initiated with hashlock:', hashlock);
  };

  const getStatusIcon = (status: boolean) => {
    return status ? <CheckIcon color="success" /> : <CancelIcon color="error" />;
  };

  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            flexDirection: 'column',
            gap: 2
          }}
        >
          <CircularProgress size={60} />
          <Typography variant="h5" color="text.secondary">
            Loading Atomic Swap Interface...
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Checking relayer status...
          </Typography>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              fontSize: '14px',
              fontWeight: '500',
            },
            success: {
              duration: 5000,
              style: {
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#fff',
              },
              iconTheme: {
                primary: '#fff',
                secondary: '#10b981',
              },
            },
            error: {
              duration: 6000,
              style: {
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                color: '#fff',
              },
              iconTheme: {
                primary: '#fff',
                secondary: '#ef4444',
              },
            },
          }}
        />

        {/* Header */}
        <Box sx={{ bgcolor: 'primary.main', color: 'white', py: 4, mb: 4 }}>
          <Container maxWidth="lg">
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <SwapIcon sx={{ fontSize: 48, mr: 2 }} />
              <Box>
                <Typography variant="h2" component="h1" fontWeight="bold">
                  Cross-Chain Atomic Swap
                </Typography>
                <Typography variant="h6" sx={{ opacity: 0.9 }}>
                  Ethereum ↔ Aptos powered by HTLC (Hash Time Locked Contracts)
                </Typography>
              </Box>
            </Box>
          </Container>
        </Box>

        <Container maxWidth="lg" sx={{ pb: 6 }}>
          {/* Relayer Status */}
          <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
            <Typography variant="h5" gutterBottom fontWeight="bold">
              System Status
            </Typography>
            {relayerStatus ? (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {getStatusIcon(relayerStatus.relayer.running)}
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Relayer
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {relayerStatus.relayer.running ? 'Online' : 'Offline'}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {getStatusIcon(relayerStatus.ethereum.connected)}
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Ethereum
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {relayerStatus.ethereum.connected ? 'Connected' : 'Disconnected'}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {getStatusIcon(relayerStatus.aptos.connected)}
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Aptos
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {relayerStatus.aptos.connected ? 'Connected' : 'Disconnected'}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ScheduleIcon color="primary" />
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Uptime
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {Math.floor(relayerStatus.relayer.uptime / 60)}m {Math.floor(relayerStatus.relayer.uptime % 60)}s
                    </Typography>
                  </Box>
                </Box>
              </Box>
            ) : (
              <Alert severity="warning">
                <Typography variant="body2">
                  Cannot connect to relayer. Please ensure the relayer is running on http://localhost:3001
                </Typography>
              </Alert>
            )}
          </Paper>

          {/* Wallet Connections */}
          <WalletConnector onConnectionChange={setWalletConnection} />

          {/* Swap Form */}
          <SwapForm 
            walletConnection={walletConnection} 
            onSwapInitiated={handleSwapInitiated}
          />

          {/* Swap List */}
          <SwapList walletConnection={walletConnection} />

          {/* Instructions */}
          <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
            <Typography variant="h5" gutterBottom fontWeight="bold">
              How to Use
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 3 }}>
              <Box component="ol" sx={{ pl: 2 }}>
                <Typography component="li" variant="body1" sx={{ mb: 1 }}>
                  <strong>Connect Wallets:</strong> Connect both MetaMask (Ethereum) and Petra (Aptos) wallets
                </Typography>
                <Typography component="li" variant="body1" sx={{ mb: 1 }}>
                  <strong>Initiate Swap:</strong> Choose the source chain, enter input and output amounts, and recipient address
                </Typography>
                <Typography component="li" variant="body1" sx={{ mb: 1 }}>
                  <strong>Complete Swap:</strong> Use the secret to complete the swap on the target chain
                </Typography>
                <Typography component="li" variant="body1" sx={{ mb: 1 }}>
                  <strong>Monitor:</strong> Track swap status and manage pending swaps
                </Typography>
              </Box>
              <Alert severity="warning">
                <Typography variant="h6" gutterBottom>
                  ⚠️ Important Notes
                </Typography>
                <Box component="ul" sx={{ pl: 2, m: 0 }}>
                  <Typography component="li" variant="body2" sx={{ mb: 0.5 }}>
                    This is a test environment using local Ethereum and Aptos testnet
                  </Typography>
                  <Typography component="li" variant="body2" sx={{ mb: 0.5 }}>
                    Keep your secrets safe - they're required to complete swaps
                  </Typography>
                  <Typography component="li" variant="body2" sx={{ mb: 0.5 }}>
                    Swaps have time limits - complete or refund before expiration
                  </Typography>
                  <Typography component="li" variant="body2">
                    Test with small amounts first
                  </Typography>
                </Box>
              </Alert>
            </Box>
          </Paper>
        </Container>

        {/* Footer */}
        <Box sx={{ bgcolor: 'grey.100', py: 3, mt: 6 }}>
          <Container maxWidth="lg">
            <Typography variant="body2" color="text.secondary" align="center">
              Ethereum ↔ Aptos Atomic Swap Bridge | Built with React, TypeScript, and HTLC
            </Typography>
          </Container>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;
