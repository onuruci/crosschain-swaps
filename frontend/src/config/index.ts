// Environment configuration for the frontend
export const config = {
  // Ethereum Configuration
  ethereum: {
    rpcUrl: process.env.REACT_APP_ETHEREUM_RPC_URL || 'http://127.0.0.1:8545',
    chainId: process.env.REACT_APP_ETHEREUM_CHAIN_ID || '31337',
    contractAddress: process.env.REACT_APP_ETHEREUM_CONTRACT_ADDRESS || '0xa85233C63b9Ee964Add6F2cffe00Fd84eb32338f',
    resolverAddress: process.env.REACT_APP_RESOLVER_ETHEREUM_ADDRESS!, // Hardhat account #1
  },

  // Aptos Configuration
  aptos: {
    nodeUrl: process.env.REACT_APP_APTOS_NODE_URL || 'https://fullnode.testnet.aptoslabs.com',
    chainId: process.env.REACT_APP_APTOS_CHAIN_ID!,
    contractAddress: process.env.REACT_APP_APTOS_CONTRACT_ADDRESS!,
    moduleName: process.env.REACT_APP_APTOS_MODULE_NAME || 'AtomicSwapV5',
    resolverAddress: process.env.REACT_APP_RESOLVER_APTOS_ADDRESS!, // Example Aptos resolver address
    apiKey: process.env.REACT_APP_APTOS_API_KEY!,
  },


  resolver: {
    url: process.env.REACT_APP_RESOLVER_URL || 'http://localhost:3001',
  },

  // Network Configuration
  network: process.env.REACT_APP_NETWORK || 'local',

  // Environment
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
} as const;

// Type for the config object
export type Config = typeof config; 