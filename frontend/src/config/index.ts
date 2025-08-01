// Environment configuration for the frontend
export const config = {
  // Ethereum Configuration
  ethereum: {
    rpcUrl: process.env.REACT_APP_ETHEREUM_RPC_URL!,
    chainId: process.env.REACT_APP_ETHEREUM_CHAIN_ID!,
    contractAddress: process.env.REACT_APP_ETHEREUM_CONTRACT_ADDRESS!,
    resolverAddress: process.env.REACT_APP_RESOLVER_ETHEREUM_ADDRESS!, // Hardhat account #1
    wethAddress: process.env.REACT_APP_WETH_ADDRESS!, // WETH contract address
  },

  // Aptos Configuration
  aptos: {
    nodeUrl: process.env.REACT_APP_APTOS_NODE_URL!,
    chainId: process.env.REACT_APP_APTOS_CHAIN_ID!,
    contractAddress: process.env.REACT_APP_APTOS_CONTRACT_ADDRESS!,
    moduleName: process.env.REACT_APP_APTOS_MODULE_NAME!,
    resolverAddress: process.env.REACT_APP_RESOLVER_APTOS_ADDRESS!, // Example Aptos resolver address
    apiKey: process.env.REACT_APP_APTOS_API_KEY!,
    faCoinAddress: '0xa89f86c9718dacde29820358fbfefedf099425ba278549396dee6cf5ca30d717::fa_coin',
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