// Environment configuration for the frontend
export const config = {
  // Ethereum Configuration
  ethereum: {
    rpcUrl: process.env.REACT_APP_ETHEREUM_RPC_URL || 'http://127.0.0.1:8545',
    chainId: process.env.REACT_APP_ETHEREUM_CHAIN_ID || '31337',
    contractAddress: process.env.REACT_APP_ETHEREUM_CONTRACT_ADDRESS || '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707',
    resolverAddress: process.env.REACT_APP_RESOLVER_ETHEREUM_ADDRESS!, // Hardhat account #1
  },

  // Aptos Configuration
  aptos: {
    nodeUrl: process.env.REACT_APP_APTOS_NODE_URL || 'https://fullnode.testnet.aptoslabs.com',
    chainId: process.env.REACT_APP_APTOS_CHAIN_ID!,
    contractAddress: process.env.REACT_APP_APTOS_CONTRACT_ADDRESS!,
    moduleName: process.env.REACT_APP_APTOS_MODULE_NAME || 'AtomicSwapV5',
    resolverAddress: process.env.REACT_APP_RESOLVER_APTOS_ADDRESS!, // Example Aptos resolver address
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