import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Paper,
  Divider,
  Alert
} from '@mui/material';
import {
  AccountBalanceWallet as WalletIcon,
  Link as LinkIcon,
  LinkOff as DisconnectIcon,
  CurrencyBitcoin as EthIcon,
  CurrencyExchange as AptosIcon
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import { ethereumService } from '../services/ethereum';
import { aptosService } from '../services/aptos';
import { WalletConnection } from '../types';

interface WalletConnectorProps {
  onConnectionChange: (connection: WalletConnection) => void;
}

const WalletConnector: React.FC<WalletConnectorProps> = ({ onConnectionChange }) => {
  const [connection, setConnection] = useState<WalletConnection>({
    ethereum: { connected: false },
    aptos: { connected: false }
  });
  const [loading, setLoading] = useState({ ethereum: false, aptos: false });

  useEffect(() => {
    onConnectionChange(connection);
  }, [connection, onConnectionChange]);

  const connectEthereum = async () => {
    setLoading({ ...loading, ethereum: true });
    try {
      const address = await ethereumService.connect();
      const newConnection = {
        ...connection,
        ethereum: { connected: true, address }
      };
      setConnection(newConnection);
      toast.success(`Ethereum wallet connected: ${address.slice(0, 6)}...${address.slice(-4)}`);
    } catch (error) {
      console.error('Failed to connect Ethereum wallet:', error);
      toast.error('Failed to connect Ethereum wallet: ' + (error as Error).message);
    } finally {
      setLoading({ ...loading, ethereum: false });
    }
  };

  const disconnectEthereum = async () => {
    await ethereumService.disconnect();
    const newConnection = {
      ...connection,
      ethereum: { connected: false }
    };
    setConnection(newConnection);
    toast.success('Ethereum wallet disconnected');
  };

  const connectAptos = async () => {
    setLoading({ ...loading, aptos: true });
    try {
      const address = await aptosService.connect();
      const newConnection = {
        ...connection,
        aptos: { connected: true, address }
      };
      setConnection(newConnection);
      toast.success(`Aptos wallet connected: ${address.slice(0, 6)}...${address.slice(-4)}`);
    } catch (error) {
      console.error('Failed to connect Aptos wallet:', error);
      toast.error('Failed to connect Aptos wallet: ' + (error as Error).message);
    } finally {
      setLoading({ ...loading, aptos: false });
    }
  };

  const disconnectAptos = async () => {
    await aptosService.disconnect();
    const newConnection = {
      ...connection,
      aptos: { connected: false }
    };
    setConnection(newConnection);
    toast.success('Aptos wallet disconnected');
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <Card elevation={3} sx={{ maxWidth: 800, mx: 'auto', mb: 4 }}>
      <CardContent sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <WalletIcon sx={{ fontSize: 32, color: 'primary.main', mr: 2 }} />
          <Typography variant="h4" component="h2" fontWeight="bold">
            Wallet Connections
          </Typography>
        </Box>

                          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
           {/* Ethereum Wallet */}
           <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
             <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
               <EthIcon sx={{ fontSize: 24, color: '#627eea', mr: 1 }} />
               <Typography variant="h6" fontWeight="bold">
                 Ethereum (MetaMask)
               </Typography>
             </Box>

             {connection.ethereum.connected ? (
               <Box>
                 <Chip
                   label="Connected"
                   color="success"
                   icon={<LinkIcon />}
                   sx={{ mb: 2 }}
                 />
                 <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                   {connection.ethereum.address && formatAddress(connection.ethereum.address)}
                 </Typography>
                 <Button
                   variant="outlined"
                   color="error"
                   startIcon={<DisconnectIcon />}
                   onClick={disconnectEthereum}
                   disabled={loading.ethereum}
                   fullWidth
                 >
                   {loading.ethereum ? 'Disconnecting...' : 'Disconnect'}
                 </Button>
               </Box>
             ) : (
               <Box>
                 <Chip
                   label="Disconnected"
                   color="default"
                   icon={<DisconnectIcon />}
                   sx={{ mb: 2 }}
                 />
                 <Button
                   variant="contained"
                   startIcon={<LinkIcon />}
                   onClick={connectEthereum}
                   disabled={loading.ethereum}
                   fullWidth
                   sx={{ 
                     background: 'linear-gradient(135deg, #627eea, #4c63d2)',
                     '&:hover': {
                       background: 'linear-gradient(135deg, #4c63d2, #3b4f9a)'
                     }
                   }}
                 >
                   {loading.ethereum ? 'Connecting...' : 'Connect MetaMask'}
                 </Button>
               </Box>
             )}
           </Paper>

           {/* Aptos Wallet */}
           <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
             <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
               <AptosIcon sx={{ fontSize: 24, color: '#00d4aa', mr: 1 }} />
               <Typography variant="h6" fontWeight="bold">
                 Aptos (Petra)
               </Typography>
             </Box>

             {connection.aptos.connected ? (
               <Box>
                 <Chip
                   label="Connected"
                   color="success"
                   icon={<LinkIcon />}
                   sx={{ mb: 2 }}
                 />
                 <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                   {connection.aptos.address && formatAddress(connection.aptos.address)}
                 </Typography>
                 <Button
                   variant="outlined"
                   color="error"
                   startIcon={<DisconnectIcon />}
                   onClick={disconnectAptos}
                   disabled={loading.aptos}
                   fullWidth
                 >
                   {loading.aptos ? 'Disconnecting...' : 'Disconnect'}
                 </Button>
               </Box>
             ) : (
               <Box>
                 <Chip
                   label="Disconnected"
                   color="default"
                   icon={<DisconnectIcon />}
                   sx={{ mb: 2 }}
                 />
                                    <Button
                     variant="contained"
                     startIcon={<LinkIcon />}
                     onClick={connectAptos}
                     disabled={loading.aptos}
                     fullWidth
                     sx={{ 
                       background: 'linear-gradient(135deg, #00d4aa, #00b894)',
                       '&:hover': {
                         background: 'linear-gradient(135deg, #00b894, #00a085)'
                       }
                     }}
                   >
                     {loading.aptos ? 'Connecting...' : 'Connect Petra'}
                   </Button>
                 </Box>
               )}
             </Paper>
           </Box>

        <Divider sx={{ my: 3 }} />

        <Alert severity="info">
          <Typography variant="body2">
            <strong>Note:</strong> You need to connect both wallets to perform cross-chain swaps. 
            The source chain wallet will be used to initiate the swap.
          </Typography>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default WalletConnector; 