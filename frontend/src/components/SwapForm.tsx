import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Chip,
  Divider,
  IconButton,
  Tooltip,
  Paper
} from '@mui/material';
import {
  SwapHoriz as SwapIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import { ResolverSwapRequest, WalletConnection } from '../types';
import { ethereumService } from '../services/ethereum';
import { aptosService } from '../services/aptos';
import { swapsApi } from '../store/swapsApi';
import { useDispatch } from 'react-redux';

interface SwapFormProps {
  walletConnection: WalletConnection;
  onSwapInitiated: (hashlock: string) => void;
}

const SwapForm: React.FC<SwapFormProps> = ({ walletConnection, onSwapInitiated }) => {
  const [formData, setFormData] = useState<ResolverSwapRequest>({
    fromChain: 'ethereum',
    toChain: 'aptos',
    fromToken: 'ETH',
    toToken: 'APT',
    inputAmount: '',
    outputAmount: '',
    recipient: '',
    timelock: 3600 // 1 hour default
  });
  const [loading, setLoading] = useState(false);
  
  // Get the dispatch function to invalidate cache
  const dispatch = useDispatch();

  const handleInputChange = (e: any) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'timelock' ? parseInt(value) : value
    }));
  };

  const handleChainChange = (e: any) => {
    const fromChain = e.target.value as 'ethereum' | 'aptos';
    const toChain = fromChain === 'ethereum' ? 'aptos' : 'ethereum';
    
    setFormData(prev => ({
      ...prev,
      fromChain,
      toChain,
      fromToken: fromChain === 'ethereum' ? 'ETH' : 'APT',
      toToken: toChain === 'ethereum' ? 'ETH' : 'APT',
      inputAmount: '',
      outputAmount: ''
    }));
  };

  const clearAllHashlocks = () => {
    const keys = Object.keys(localStorage);
    const hashlockKeys = keys.filter(key => key.startsWith('swap_secret_') || key.includes('hashlock'));
    hashlockKeys.forEach(key => {
      localStorage.removeItem(key);
    });
    toast.success(`Cleared ${hashlockKeys.length} stored hashlocks`);
    console.log('🧹 Cleared stored hashlocks:', hashlockKeys);
  };

  const validateForm = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!formData.inputAmount || parseFloat(formData.inputAmount) <= 0) {
      errors.push('Please enter a valid input amount');
    }

    if (!formData.outputAmount || parseFloat(formData.outputAmount) <= 0) {
      errors.push('Please enter a valid output amount');
    }

    if (!formData.recipient) {
      errors.push('Please enter a recipient address');
    } else {
      // Validate recipient address format
      if (formData.fromChain === 'ethereum') {
        if (!formData.recipient.startsWith('0x') || formData.recipient.length !== 42) {
          errors.push('Invalid Ethereum address format (should be 0x + 40 hex characters)');
        } else {
          const hexPart = formData.recipient.slice(2);
          if (!/^[0-9a-fA-F]{40}$/.test(hexPart)) {
            errors.push('Invalid Ethereum address: contains invalid hex characters');
          }
        }
      } else if (formData.fromChain === 'aptos') {
        if (!formData.recipient.startsWith('0x') || formData.recipient.length !== 66) {
          errors.push('Invalid Aptos address format (should be 0x + 64 hex characters)');
        } else {
          const hexPart = formData.recipient.slice(2);
          if (!/^[0-9a-fA-F]{64}$/.test(hexPart)) {
            errors.push('Invalid Aptos address: contains invalid hex characters');
          }
        }
      }
    }

    // Check wallet connections
    if (formData.fromChain === 'ethereum' && !walletConnection.ethereum.connected) {
      errors.push('Please connect your Ethereum wallet first');
    }
    if (formData.fromChain === 'aptos' && !walletConnection.aptos.connected) {
      errors.push('Please connect your Aptos wallet first');
    }

    return { isValid: errors.length === 0, errors };
  };

  const initiateSwap = async () => {
    const validation = validateForm();
    if (!validation.isValid) {
      validation.errors.forEach(error => toast.error(error));
      return;
    }

    setLoading(true);
    try {
      // Generate secret and hashlock
      const secret = ethereumService.generateSecret();
      const hashlock = ethereumService.generateHashlock(secret);
      
      console.log('Generated new swap:', {
        secret: secret.substring(0, 16) + '...',
        hashlock: hashlock.substring(0, 16) + '...',
        timestamp: new Date().toISOString()
      });
      
      // Calculate timelock
      const currentTime = Math.floor(Date.now() / 1000);
      const timelock = currentTime + formData.timelock;

      // Initiate swap on the source chain
      if (formData.fromChain === 'ethereum') {
        await ethereumService.initiateSwap(
          formData.recipient,
          hashlock,
          timelock,
          formData.inputAmount
        );
        localStorage.setItem(`swap_ethereum_recipient_${hashlock}`, formData.recipient);
      } else {
        await aptosService.initiateSwap(
          formData.recipient,
          hashlock,
          timelock,
          formData.inputAmount
        );
        localStorage.setItem(`swap_aptos_recipient_${hashlock}`, formData.recipient);
      }

      // Store the secret locally
      localStorage.setItem(`swap_secret_${hashlock}`, secret);

      // Notify parent component
      onSwapInitiated(hashlock);

      // Reset form
      setFormData(prev => ({
        ...prev,
        inputAmount: '',
        outputAmount: '',
        recipient: ''
      }));

              toast.success(`Swap initiated successfully! Hashlock: ${hashlock.substring(0, 16)}...`);
        
        // Invalidate the swaps cache to trigger a refetch
        dispatch(swapsApi.util.invalidateTags(['Swap']));
      } catch (error) {
        console.error('Failed to initiate swap:', error);
        toast.error('Failed to initiate swap: ' + (error as Error).message);
      } finally {
        setLoading(false);
      }
    };

  const getAddressPlaceholder = () => {
    return formData.fromChain === 'ethereum' 
      ? '0x1234... (40 hex characters)' 
      : '0x1234... (64 hex characters)';
  };

  const getAddressHelpText = () => {
    return formData.fromChain === 'ethereum'
      ? 'Enter the Ethereum address that will receive the ETH'
      : 'Enter the Aptos address that will receive the APT';
  };

  return (
    <Card elevation={3} sx={{ maxWidth: 800, mx: 'auto', mb: 4 }}>
      <CardContent sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <SwapIcon sx={{ fontSize: 32, color: 'primary.main', mr: 2 }} />
          <Typography variant="h4" component="h2" fontWeight="bold">
            Cross-Chain Atomic Swap
          </Typography>
        </Box>

        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Resolver Pattern:</strong> Enter the amount you want to send and the amount you expect to receive. 
            The swap will be initiated on the source chain with the resolver's address as recipient.
          </Typography>
        </Alert>

                 <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
           {/* Chain Selection */}
           <Paper elevation={1} sx={{ p: 3, bgcolor: 'grey.50' }}>
             <Typography variant="h6" gutterBottom>
               Chain Configuration
             </Typography>
             <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
               <FormControl fullWidth>
                 <InputLabel>From Chain</InputLabel>
                 <Select
                   name="fromChain"
                   value={formData.fromChain}
                   onChange={handleChainChange}
                   disabled={loading}
                 >
                   <MenuItem value="ethereum">
                     <Box sx={{ display: 'flex', alignItems: 'center' }}>
                       <Chip label="ETH" size="small" sx={{ mr: 1 }} />
                       Ethereum
                     </Box>
                   </MenuItem>
                   <MenuItem value="aptos">
                     <Box sx={{ display: 'flex', alignItems: 'center' }}>
                       <Chip label="APT" size="small" sx={{ mr: 1 }} />
                       Aptos
                     </Box>
                   </MenuItem>
                 </Select>
               </FormControl>
               <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                 <SwapIcon sx={{ mx: 2, color: 'text.secondary' }} />
                 <Typography variant="body1" color="text.secondary">
                   {formData.toChain === 'ethereum' ? 'Ethereum' : 'Aptos'}
                 </Typography>
               </Box>
             </Box>
           </Paper>

           {/* Amount Inputs */}
           <Paper elevation={1} sx={{ p: 3, bgcolor: 'grey.50' }}>
             <Typography variant="h6" gutterBottom>
               Swap Amounts
             </Typography>
             <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
               <TextField
                 fullWidth
                 label={`Input Amount (${formData.fromToken})`}
                 name="inputAmount"
                 type="number"
                 value={formData.inputAmount}
                 onChange={handleInputChange}
                 placeholder="0.1"
                 inputProps={{ step: "0.001", min: "0" }}
                 disabled={loading}
                 helperText={`Amount you're sending from ${formData.fromChain}`}
               />
               <TextField
                 fullWidth
                 label={`Output Amount (${formData.toToken})`}
                 name="outputAmount"
                 type="number"
                 value={formData.outputAmount}
                 onChange={handleInputChange}
                 placeholder="0.1"
                 inputProps={{ step: "0.001", min: "0" }}
                 disabled={loading}
                 helperText={`Amount you expect to receive on ${formData.toChain}`}
               />
             </Box>
           </Paper>

           {/* Recipient Address */}
           <TextField
             fullWidth
             label="Recipient Address"
             name="recipient"
             value={formData.recipient}
             onChange={handleInputChange}
             placeholder={getAddressPlaceholder()}
             disabled={loading}
             helperText={getAddressHelpText()}
             InputProps={{
               endAdornment: (
                 <Tooltip title="This address will receive the tokens on the source chain">
                   <IconButton size="small">
                     <InfoIcon />
                   </IconButton>
                 </Tooltip>
               ),
             }}
           />

           {/* Timelock */}
           <TextField
             fullWidth
             label="Timelock (seconds)"
             name="timelock"
             type="number"
             value={formData.timelock}
             onChange={handleInputChange}
             inputProps={{ min: "300", max: "86400" }}
             disabled={loading}
             helperText="Time limit for completing the swap"
             sx={{ maxWidth: { sm: '50%' } }}
           />


         </Box>

        <Divider sx={{ my: 3 }} />

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            size="large"
            onClick={initiateSwap}
            disabled={loading || !formData.inputAmount || !formData.outputAmount || !formData.recipient}
            startIcon={loading ? undefined : <SwapIcon />}
            sx={{ 
              px: 4, 
              py: 1.5, 
              fontSize: '1.1rem',
              borderRadius: 2,
              minWidth: 200
            }}
          >
            {loading ? 'Initiating Swap...' : 'Initiate Swap'}
          </Button>
          
          <Button
            variant="outlined"
            size="large"
            onClick={clearAllHashlocks}
            sx={{ 
              px: 4, 
              py: 1.5, 
              fontSize: '1.1rem',
              borderRadius: 2,
              minWidth: 200
            }}
          >
            Clear Stored Hashlocks
          </Button>
        </Box>

        {/* Warning */}
        <Alert severity="warning" sx={{ mt: 3 }}>
          <Typography variant="body2">
            <strong>Important:</strong> This swap will be initiated on {formData.fromChain} with the resolver's address as recipient. 
            Keep your secret safe - it's required to complete the swap on {formData.toChain}.
          </Typography>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default SwapForm; 