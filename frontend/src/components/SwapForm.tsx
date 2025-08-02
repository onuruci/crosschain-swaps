import React, { useState, useEffect } from 'react';
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
  Paper,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  SwapHoriz as SwapIcon,
  Info as InfoIcon,
  CheckCircle as CheckIcon,
  Schedule as ScheduleIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import { ResolverSwapRequest, WalletConnection } from '../types';
import { ethereumService } from '../services/ethereum';
import { aptosService } from '../services/aptos';
import { resolverService } from '../services/resolver';
import { secretStore } from '../services/secretStore';
import { swapsApi } from '../store/swapsApi';
import { useDispatch } from 'react-redux';
import { config } from '../config';

interface SwapFormProps {
  walletConnection: WalletConnection;
  onSwapInitiated: (hashlock: string) => void;
}

// Step status type
type StepStatus = 'pending' | 'in-progress' | 'completed' | 'error';

// Step interface
interface SwapStep {
  id: string;
  title: string;
  description: string;
  status: StepStatus;
  error?: string;
}

const SwapForm: React.FC<SwapFormProps> = ({ walletConnection, onSwapInitiated }) => {
  const [formData, setFormData] = useState<ResolverSwapRequest>({
    fromChain: 'ethereum',
    toChain: 'aptos',
    fromToken: 'ETH',
    toToken: 'APT',
    inputAmount: '',
    outputAmount: '',
    recipientAddress: '', // Address on the destination chain
    timelock: 3600 // 1 hour default
  });
  const [loading, setLoading] = useState(false);
  const [resolverStatus, setResolverStatus] = useState<'checking' | 'healthy' | 'unhealthy'>('checking');
  
  // Waiting screen state
  const [showWaitingScreen, setShowWaitingScreen] = useState(false);
  const [swapSteps, setSwapSteps] = useState<SwapStep[]>([]);

  // Initialize steps based on the chain
  const initializeSteps = (fromChain: string) => {
    if (fromChain === 'ethereum') {
      setSwapSteps([
        {
          id: 'convert-eth',
          title: 'Convert ETH to WETH',
          description: 'Converting your ETH to WETH tokens',
          status: 'pending'
        },
        {
          id: 'approve-weth',
          title: 'Approve WETH Spending',
          description: 'Granting permission to spend your WETH',
          status: 'pending'
        },
        {
          id: 'sign-transaction',
          title: 'Sign Transaction',
          description: 'Signing the swap transaction for the resolver',
          status: 'pending'
        }
      ]);
    } else if (fromChain === 'aptos') {
      setSwapSteps([
        {
          id: 'convert-apt',
          title: 'Convert APT to FA Coin',
          description: 'Converting your APT to FA Coin tokens',
          status: 'pending'
        },
        {
          id: 'approve-fa-coin',
          title: 'Approve FA Coin Spending',
          description: 'Granting permission to spend your FA Coins',
          status: 'pending'
        },
        {
          id: 'sign-transaction',
          title: 'Sign Meta Transaction',
          description: 'Signing the swap transaction for the resolver',
          status: 'pending'
        }
      ]);
    }
  };
  
  // Get the dispatch function to invalidate cache
  const dispatch = useDispatch();

  // Helper function to update step status
  const updateStepStatus = (stepId: string, status: StepStatus, error?: string) => {
    setSwapSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { ...step, status, error } 
        : step
    ));
  };

  // Helper function to reset all steps
  const resetSteps = () => {
    setSwapSteps(prev => prev.map(step => ({
      ...step,
      status: 'pending' as StepStatus,
      error: undefined
    })));
  };

  // Get current progress percentage
  const getProgressPercentage = () => {
    const completedSteps = swapSteps.filter(step => step.status === 'completed').length;
    return (completedSteps / swapSteps.length) * 100;
  };
  // Waiting Screen Component
  const WaitingScreen = () => (
    <Dialog 
      open={showWaitingScreen} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white'
        }
      }}
    >
      <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
          <SwapIcon sx={{ fontSize: 40, mr: 2 }} />
          <Typography variant="h5" fontWeight="bold">
            Processing {formData.fromChain === 'ethereum' ? 'Ethereum' : 'Aptos'} Swap
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ opacity: 0.9 }}>
          Please wait while we process your swap request...
        </Typography>
      </DialogTitle>
      
      <DialogContent sx={{ pb: 3 }}>
        {/* Progress Bar */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Progress
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              {Math.round(getProgressPercentage())}%
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={getProgressPercentage()} 
            sx={{ 
              height: 8, 
              borderRadius: 4,
              backgroundColor: 'rgba(255,255,255,0.2)',
              '& .MuiLinearProgress-bar': {
                backgroundColor: '#4CAF50',
                borderRadius: 4
              }
            }} 
          />
        </Box>

        {/* Steps */}
        <Stepper orientation="vertical" sx={{ 
          '& .MuiStepLabel-root': { color: 'white' },
          '& .MuiStepLabel-label': { color: 'white' },
          '& .MuiStepLabel-labelContainer': { color: 'white' }
        }}>
          {swapSteps.map((step, index) => (
            <Step key={step.id} active={step.status === 'in-progress'} completed={step.status === 'completed'}>
              <StepLabel
                StepIconComponent={({ active, completed }) => {
                  if (completed) {
                    return <CheckIcon sx={{ color: '#4CAF50', fontSize: 24 }} />;
                  } else if (active) {
                    return <ScheduleIcon sx={{ color: '#FF9800', fontSize: 24 }} />;
                  } else if (step.status === 'error') {
                    return <ErrorIcon sx={{ color: '#F44336', fontSize: 24 }} />;
                  } else {
                    return <ScheduleIcon sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 24 }} />;
                  }
                }}
              >
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {step.title}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8, mt: 0.5 }}>
                    {step.description}
                  </Typography>
                  {step.status === 'in-progress' && (
                    <Typography variant="body2" sx={{ color: '#FF9800', mt: 0.5, fontStyle: 'italic' }}>
                      Processing...
                    </Typography>
                  )}
                  {step.status === 'error' && step.error && (
                    <Typography variant="body2" sx={{ color: '#F44336', mt: 0.5 }}>
                      Error: {step.error}
                    </Typography>
                  )}
                </Box>
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </DialogContent>
    </Dialog>
  );

  // Check resolver health on component mount
  useEffect(() => {
    const checkResolverHealth = async () => {
      try {
        const healthy = await resolverService.checkHealth();
        setResolverStatus(healthy ? 'healthy' : 'unhealthy');
      } catch (error) {
        console.warn('Resolver health check failed:', error);
        setResolverStatus('unhealthy');
      }
    };

    checkResolverHealth();
  }, []);

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
      outputAmount: '',
      recipientAddress: '' // Reset recipient address when chain changes
    }));
  };

  const clearAllSecrets = () => {
    const count = secretStore.getSecretCount();
    secretStore.clearAllSecrets();
    toast.success(`Cleared ${count} secrets from memory`);
    console.log('🧹 Cleared secrets from memory');
  };

  const completeSwap = async (hashlock: string) => {
    const secret = secretStore.getSecret(hashlock);
    if (!secret) {
      toast.error('Secret not found for this hashlock');
      return;
    }

    setLoading(true);
    try {
      console.log('🔄 Completing swap with hashlock:', hashlock.substring(0, 16) + '...');
      
      const result = await resolverService.completeSwaps(hashlock, secret);
      
      if (result.success) {
        // Remove the secret after successful completion
        secretStore.removeSecret(hashlock);
        
        toast.success(`Swap completed successfully! Ethereum: ${result.ethereum.txHash.substring(0, 16)}..., Aptos: ${result.aptos.txHash.substring(0, 16)}...`);
        
        // Invalidate the swaps cache to trigger a refetch
        dispatch(swapsApi.util.invalidateTags(['Swap']));
      } else {
        toast.error('Failed to complete swap');
      }
    } catch (error) {
      console.error('Failed to complete swap:', error);
      toast.error('Failed to complete swap: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = async (): Promise<{ isValid: boolean; errors: string[] }> => {
    const errors: string[] = [];

    if (!formData.inputAmount || parseFloat(formData.inputAmount) <= 0) {
      errors.push('Please enter a valid input amount');
    }

    if (!formData.outputAmount || parseFloat(formData.outputAmount) <= 0) {
      errors.push('Please enter a valid output amount');
    }

    if (!formData.recipientAddress || formData.recipientAddress.trim() === '') {
      errors.push('Please enter the recipient address on the destination chain');
    }

    // Check wallet connections
    if (formData.fromChain === 'ethereum' && !walletConnection.ethereum.connected) {
      errors.push('Please connect your Ethereum wallet first');
    }
    if (formData.fromChain === 'aptos' && !walletConnection.aptos.connected) {
      errors.push('Please connect your Aptos wallet first');
    }

    // Check resolver availability
    const resolverHealthy = await resolverService.checkHealth();
    if (!resolverHealthy) {
      errors.push('Resolver service is not available. Please ensure the resolver is running.');
    }

    return { isValid: errors.length === 0, errors };
  };

  const initiateSwap = async () => {
    const validation = await validateForm();
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

      // Get resolver address based on the source chain
      const resolverAddress = formData.fromChain === 'ethereum' 
        ? config.ethereum.resolverAddress 
        : config.aptos.resolverAddress;

      // Get the user's address for the source chain (where they're sending from)
      const userAddress = formData.fromChain === 'ethereum' 
        ? walletConnection.ethereum.address 
        : walletConnection.aptos.address;
      
      if (!userAddress) {
        throw new Error(`No ${formData.fromChain} wallet address available`);
      }

      // Use the recipient address from the form for the destination chain
      const recipientAddress = formData.recipientAddress.trim();

      // Initiate swap on the source chain using resolver address
      if (formData.fromChain === 'ethereum') {
        // Show waiting screen and reset steps
        setShowWaitingScreen(true);
        initializeSteps('ethereum');
        resetSteps();
        
        try {
          // Step 1: Convert ETH to WETH
          console.log('🔄 Starting new ETH→WETH swap flow...');
          updateStepStatus('convert-eth', 'in-progress');
          
          console.log('📥 Converting ETH to WETH...');
          await ethereumService.convertEthToWeth(formData.inputAmount);
          updateStepStatus('convert-eth', 'completed');
          toast.success('ETH converted to WETH successfully');
          
          // Step 2: Approve WETH spending for AtomicSwap contract
          console.log('🔐 Approving WETH spending for AtomicSwap contract...');
          updateStepStatus('approve-weth', 'in-progress');
          
          await ethereumService.approveWethForAtomicSwap(formData.inputAmount);
          updateStepStatus('approve-weth', 'completed');
          toast.success('WETH approval granted to AtomicSwap contract');
          
          // Step 3: Sign the transaction for resolver
          console.log('✍️ Signing transaction for resolver...');
          updateStepStatus('sign-transaction', 'in-progress');
          
          const swapres = await ethereumService.initiateSwapSignature(
            resolverAddress,
            hashlock,
            timelock,
            formData.inputAmount,
          );

          updateStepStatus('sign-transaction', 'completed');
          console.log("SWAP RES:  ", swapres)
          
          // Call resolver to create counter swap on Aptos
          console.log('🔄 Initiating counter swap on Aptos via resolver...');
          const counterSwapResult = await resolverService.createAptosCounterSwap(
            swapres.swapData,
            swapres.signature,
            formData.recipientAddress,
            formData.outputAmount,
          );
          
          if (counterSwapResult.success) {
            console.log('✅ Counter swap created on Aptos:', counterSwapResult.txHash);
            localStorage.setItem(`swap_aptos_counter_${hashlock}`, counterSwapResult.txHash || '');
          } else {
            console.warn('⚠️ Counter swap creation failed:', counterSwapResult.error);
            toast.error(`Swap initiated but counter swap failed: ${counterSwapResult.error}`);
          }
          
          // Close waiting screen after successful completion
          setTimeout(() => {
            setShowWaitingScreen(false);
          }, 2000);
          
        } catch (error) {
          // Update the current step with error
          const currentStep = swapSteps.find(step => step.status === 'in-progress');
          if (currentStep) {
            updateStepStatus(currentStep.id, 'error', (error as Error).message);
          }
          
          // Keep waiting screen open for a bit to show error
          setTimeout(() => {
            setShowWaitingScreen(false);
          }, 3000);
          
          throw error;
        }
      } else if (formData.fromChain === 'aptos') {
        // Show waiting screen and reset steps
        setShowWaitingScreen(true);
        initializeSteps('aptos');
        resetSteps();
        
        try {
          // Step 1: Convert APT to FA Coin
          console.log('🔄 Starting new APT→FA Coin swap flow...');
          updateStepStatus('convert-apt', 'in-progress');
          
          console.log('📥 Converting APT to FA Coin...');
          await aptosService.depositAptToFaCoin(formData.inputAmount);
          updateStepStatus('convert-apt', 'completed');
          toast.success('APT converted to FA Coin successfully');
          
          console.log('🔐 Approving FA Coin spending for AtomicSwap contract...');
          updateStepStatus('approve-fa-coin', 'in-progress');
          
          await aptosService.approveFaCoinForAtomicSwap(formData.inputAmount);
          updateStepStatus('approve-fa-coin', 'completed');
          toast.success('FA Coin approval granted to AtomicSwap contract');
          
          console.log('✍️ Signing meta transaction for resolver...');
          updateStepStatus('sign-transaction', 'in-progress');
          
          const swapres = await aptosService.initiateSwapSignature(
            resolverAddress,
            hashlock,
            timelock,
            formData.inputAmount,
          );

          updateStepStatus('sign-transaction', 'completed');
          console.log("APTOS SWAP RES:  ", swapres);
          
          // Call resolver to create counter swap on Ethereum using meta transaction
          console.log('🔄 Initiating counter swap on Ethereum via resolver...');
          const counterSwapResult = await resolverService.createEthereumCounterSwap(
            swapres.swapData,
            swapres.signature,
            formData.recipientAddress,
            formData.outputAmount,
          );
          
          if (counterSwapResult.success) {
            console.log('✅ Counter swap created on Ethereum:', counterSwapResult.txHash);
            localStorage.setItem(`swap_ethereum_counter_${hashlock}`, counterSwapResult.txHash || '');
          } else {
            console.warn('⚠️ Counter swap creation failed:', counterSwapResult.error);
            toast.error(`Swap initiated but counter swap failed: ${counterSwapResult.error}`);
          }
          
          // Close waiting screen after successful completion
          setTimeout(() => {
            setShowWaitingScreen(false);
          }, 2000);
          
        } catch (error) {
          // Update the current step with error
          const currentStep = swapSteps.find(step => step.status === 'in-progress');
          if (currentStep) {
            updateStepStatus(currentStep.id, 'error', (error as Error).message);
          }
          
          // Keep waiting screen open for a bit to show error
          setTimeout(() => {
            setShowWaitingScreen(false);
          }, 3000);
          
          throw error;
        }
      }

      // Store the secret in memory
      secretStore.storeSecret(hashlock, secret);

      // Notify parent component
      onSwapInitiated(hashlock);

      // Reset form
      setFormData(prev => ({
        ...prev,
        inputAmount: '',
        outputAmount: '',
        recipientAddress: ''
      }));

      toast.success(`Swap initiated successfully! Hashlock: ${hashlock.substring(0, 16)}... Counter swap created on ${formData.toChain}.`);
        
      // Invalidate the swaps cache to trigger a refetch
      dispatch(swapsApi.util.invalidateTags(['Swap']));
    } catch (error) {
      console.error('Failed to initiate swap:', error);
      toast.error('Failed to initiate swap: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
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
            <strong>Resolver Pattern:</strong> Enter the amount you want to send, the amount you expect to receive, and the recipient address on the destination chain. 
            The swap will be initiated on the source chain with the resolver's address as recipient, and the resolver will create a counter swap on the destination chain.
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

          {/* Recipient Address Input */}
          <Paper elevation={1} sx={{ p: 3, bgcolor: 'grey.50' }}>
            <Typography variant="h6" gutterBottom>
              Recipient Address
            </Typography>
            <TextField
              fullWidth
              label={`Recipient Address (${formData.toChain === 'ethereum' ? 'Ethereum' : 'Aptos'})`}
              name="recipientAddress"
              value={formData.recipientAddress}
              onChange={handleInputChange}
              placeholder={formData.toChain === 'ethereum' ? '0x...' : '0x...'}
              disabled={loading}
              helperText={`Address on ${formData.toChain} where you want to receive the ${formData.toToken}`}
              sx={{ fontFamily: 'monospace' }}
            />
          </Paper>

          {/* Resolver Address Display */}
          <Paper elevation={1} sx={{ p: 3, bgcolor: 'grey.50' }}>
            <Typography variant="h6" gutterBottom>
              Resolver Configuration
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  {formData.fromChain === 'ethereum' ? 'Ethereum' : 'Aptos'} Resolver:
                </Typography>
                <Typography variant="body2" fontFamily="monospace" sx={{ 
                  bgcolor: 'background.paper', 
                  p: 1, 
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider'
                }}>
                  {formData.fromChain === 'ethereum' 
                    ? config.ethereum.resolverAddress 
                    : config.aptos.resolverAddress}
                </Typography>
                <Tooltip title="This is the resolver address that will receive the tokens on the source chain">
                  <IconButton size="small">
                    <InfoIcon />
                  </IconButton>
                </Tooltip>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Resolver Service:
                </Typography>
                <Chip 
                  label={resolverStatus === 'checking' ? 'Checking...' : 
                         resolverStatus === 'healthy' ? 'Healthy' : 'Unavailable'}
                  color={resolverStatus === 'healthy' ? 'success' : 
                         resolverStatus === 'checking' ? 'warning' : 'error'}
                  size="small"
                />
                <Typography variant="body2" fontFamily="monospace" sx={{ 
                  bgcolor: 'background.paper', 
                  p: 1, 
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider'
                }}>
                  {config.resolver.url}
                </Typography>
              </Box>
            </Box>
          </Paper>

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
          {secretStore.getSecretCount() > 0 && (
            <Paper elevation={1} sx={{ p: 3, bgcolor: 'grey.50' }}>
              <Typography variant="h6" gutterBottom>
                Pending Swaps ({secretStore.getSecretCount()})
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {secretStore.getStoredHashlocks().map((hashlock) => (
                  <Box key={hashlock} sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 2,
                    p: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    bgcolor: 'background.paper'
                  }}>
                    <Typography variant="body2" fontFamily="monospace" sx={{ flex: 1 }}>
                      {hashlock.substring(0, 16)}...
                    </Typography>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => completeSwap(hashlock)}
                      disabled={loading}
                    >
                      Complete Swap
                    </Button>
                  </Box>
                ))}
              </Box>
            </Paper>
          )}
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            size="large"
            onClick={initiateSwap}
            disabled={loading || !formData.inputAmount || !formData.outputAmount || !formData.recipientAddress}
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
            onClick={clearAllSecrets}
            sx={{ 
              px: 4, 
              py: 1.5, 
              fontSize: '1.1rem',
              borderRadius: 2,
              minWidth: 200
            }}
          >
            Clear Stored Secrets
          </Button>
        </Box>

        {/* Warning */}
        <Alert severity="warning" sx={{ mt: 3 }}>
          <Typography variant="body2">
            <strong>Important:</strong> This swap will be initiated on {formData.fromChain} with the resolver's address as recipient. 
            The resolver will automatically create a counter swap on {formData.toChain}. 
            Keep your secret safe - it's required to complete the swap on {formData.toChain}.
          </Typography>
        </Alert>
      </CardContent>
      
      {/* Waiting Screen */}
      <WaitingScreen />
    </Card>
  );
};

export default SwapForm; 