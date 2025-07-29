export interface SwapRequest {
  fromChain: 'ethereum' | 'aptos';
  toChain: 'ethereum' | 'aptos';
  fromToken: string;
  toToken: string;
  inputAmount: string;
  outputAmount: string;
  recipient: string;
  timelock: number;
}

export interface ResolverSwapRequest {
  fromChain: 'ethereum' | 'aptos';
  toChain: 'ethereum' | 'aptos';
  fromToken: string;
  toToken: string;
  inputAmount: string;
  outputAmount: string;
  recipientAddress: string; // Address on the destination chain
  timelock: number;
}

export interface SwapStatus {
  hashlock: string;
  initiator: string;
  recipient: string;
  amount: string;
  timelock: number;
  completed: boolean;
  refunded: boolean;
  secret?: string;
  fromChain: 'ethereum' | 'aptos';
  toChain: 'ethereum' | 'aptos';
  createdAt: number;
}

export interface WalletConnection {
  ethereum: {
    connected: boolean;
    address?: string;
    provider?: any;
  };
  aptos: {
    connected: boolean;
    address?: string;
    wallet?: any;
  };
}

 