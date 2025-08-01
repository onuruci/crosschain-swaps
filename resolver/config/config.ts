import { ATOMIC_SWAP_ABI } from "./contractAbi";

// Function to get config with dynamic environment variable loading
function getConfig() {
  // Debug logging for environment variables
  console.log('🔍 Environment Variables Debug:');
  console.log('ETHEREUM_RPC_URL:', process.env.ETHEREUM_RPC_URL);
  console.log('ETHEREUM_PRIVATE_KEY:', process.env.ETHEREUM_PRIVATE_KEY ? 'SET' : 'NOT SET');
  console.log('ETHEREUM_CONTRACT_ADDRESS:', process.env.ETHEREUM_CONTRACT_ADDRESS);
  console.log('APTOS_NODE_URL:', process.env.APTOS_NODE_URL);
  console.log('APTOS_PRIVATE_KEY:', process.env.APTOS_PRIVATE_KEY ? 'SET' : 'NOT SET');
  console.log('APTOS_CONTRACT_ADDRESS:', process.env.APTOS_CONTRACT_ADDRESS);
  console.log('RESOLVER_APTOS_ADDRESS:', process.env.RESOLVER_APTOS_ADDRESS);
  console.log('APTOS_API_KEY:', process.env.APTOS_API_KEY ? 'SET' : 'NOT SET');
  console.log('NETWORK:', process.env.NETWORK);

  return {
  // Ethereum Configuration
  ethereum: {
    rpcUrl: process.env.ETHEREUM_RPC_URL || 'http://127.0.0.1:8545',
    privateKey: process.env.ETHEREUM_PRIVATE_KEY!,
    contractAddress: process.env.ETHEREUM_CONTRACT_ADDRESS!,
    contractABI: ATOMIC_SWAP_ABI,
    wethAddress: process.env.WETH_ADDRESS!
  },

  // Aptos Configuration
  aptos: {
    nodeUrl: process.env.APTOS_NODE_URL || 'https://fullnode.testnet.aptoslabs.com',
    privateKey: process.env.APTOS_PRIVATE_KEY!,
    accountAddress: process.env.RESOLVER_APTOS_ADDRESS!,
    contractAddress: process.env.APTOS_CONTRACT_ADDRESS!,
    moduleName: process.env.APTOS_MODULE_NAME || 'AtomicSwapV5',
    apiKey: process.env.APTOS_API_KEY
  },

  // Bitcoin Configuration
  bitcoin: {
    network: process.env.BITCOIN_NETWORK || 'regtest',
    rpcUrl: process.env.BITCOIN_RPC_URL || 'http://localhost:18443',
    username: process.env.BITCOIN_RPC_USERNAME || 'user',
    password: process.env.BITCOIN_RPC_PASSWORD || 'pass'
  },

  // Network Configuration
  network: process.env.NETWORK || 'local',

    // Environment
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
  } as const;
}

// Export the config function
export const config = getConfig();

// Type for the config object
export type Config = ReturnType<typeof getConfig>; 