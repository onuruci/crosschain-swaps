// Environment configuration for the frontend
export const config = {
  // Ethereum Configuration
  ethereum: {
    rpcUrl: process.env.REACT_APP_ETHEREUM_RPC_URL || 'http://127.0.0.1:8545',
    chainId: process.env.REACT_APP_ETHEREUM_CHAIN_ID || '31337',
    contractAddress: process.env.REACT_APP_ETHEREUM_CONTRACT_ADDRESS || '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
  },

  // Aptos Configuration
  aptos: {
    nodeUrl: process.env.REACT_APP_APTOS_NODE_URL || 'https://fullnode.testnet.aptoslabs.com',
    chainId: process.env.REACT_APP_APTOS_CHAIN_ID!,
    contractAddress: process.env.REACT_APP_APTOS_CONTRACT_ADDRESS!
  },

  // Relayer Configuration
  relayer: {
    url: process.env.REACT_APP_RELAYER_URL || 'http://localhost:3001',
  },

  // Network Configuration
  network: process.env.REACT_APP_NETWORK || 'local',

  // Environment
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
} as const;

// Type for the config object
export type Config = typeof config; 