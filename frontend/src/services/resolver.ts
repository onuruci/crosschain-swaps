import { config } from '../config';

export interface ResolverSwapRequest {
  hashlock: string;
  makerAddress: string;
  timelock: number;
  amount: string;
}

export interface ResolverSwapResponse {
  success: boolean;
  txHash?: string;
  address?: string;
  error?: string;
}

class ResolverService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.resolver.url;
  }

  /**
   * Call resolver to create a counter swap on Ethereum
   */
  async createEthereumCounterSwap(
    hashlock: string,
    makerAddress: string,
    timelock: number,
    amount: string
  ): Promise<ResolverSwapResponse> {
    try {
      console.log('🔄 Calling resolver for Ethereum counter swap:', {
        hashlock: hashlock.substring(0, 16) + '...',
        makerAddress,
        timelock,
        amount
      });

      const response = await fetch(`${this.baseUrl}/swap/ethereum`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hashlock,
          makerAddress,
          timelock,
          amount
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      console.log('✅ Ethereum counter swap created:', data);
      return data;
    } catch (error) {
      console.error('❌ Error creating Ethereum counter swap:', error);
      throw error;
    }
  }

  /**
   * Call resolver to create a counter swap on Aptos
   */
  async createAptosCounterSwap(
    hashlock: string,
    makerAddress: string,
    timelock: number,
    amount: string
  ): Promise<ResolverSwapResponse> {
    try {
      console.log('🔄 Calling resolver for Aptos counter swap:', {
        hashlock: hashlock.substring(0, 16) + '...',
        makerAddress,
        timelock,
        amount
      });

      const response = await fetch(`${this.baseUrl}/swap/aptos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hashlock,
          makerAddress,
          timelock,
          amount
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      console.log('✅ Aptos counter swap created:', data);
      return data;
    } catch (error) {
      console.error('❌ Error creating Aptos counter swap:', error);
      throw error;
    }
  }

  /**
   * Complete swaps on both chains using the secret
   */
  async completeSwaps(hashlock: string, secret: string): Promise<any> {
    try {
      console.log('🔄 Completing swaps on both chains via resolver:', {
        hashlock: hashlock.substring(0, 16) + '...',
        secret: secret.substring(0, 16) + '...'
      });

      const response = await fetch(`${this.baseUrl}/complete/ethereum-and-aptos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hashlock,
          secret
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      console.log('✅ Swaps completed on both chains:', data);
      return data;
    } catch (error) {
      console.error('❌ Error completing swaps:', error);
      throw error;
    }
  }

  /**
   * Check if resolver is available
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/`);
      const data = await response.json();
      return data.success === true;
    } catch (error) {
      console.warn('⚠️ Resolver health check failed:', error);
      return false;
    }
  }
}

export const resolverService = new ResolverService();
export default ResolverService; 