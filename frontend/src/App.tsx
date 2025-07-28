import React, { useState } from 'react';
import { Provider } from 'react-redux';
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
  Cancel as CancelIcon
} from '@mui/icons-material';
import { Toaster } from 'react-hot-toast';
import WalletConnector from './components/WalletConnector';
import SwapForm from './components/SwapForm';
import SwapList from './components/SwapList';
import { WalletConnection } from './types';
import { store } from './store';

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
  const handleSwapInitiated = (hashlock: string) => {
    // Swap initiated successfully
    console.log('Swap initiated with hashlock:', hashlock);
  };

  return (
    <Provider store={store}>
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
          {/* Chain Status */}
          <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
            <Typography variant="h5" gutterBottom fontWeight="bold">
              Chain Status
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckIcon color="primary" />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Ethereum
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    Direct Chain Access
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckIcon color="primary" />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Aptos
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    Direct Chain Access
                  </Typography>
                </Box>
              </Box>
            </Box>
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
    </Provider>
  );
}

export default App;
