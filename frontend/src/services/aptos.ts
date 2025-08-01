import { AccountAddress, Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';
import { config } from '../config';
import 'petra-wallet-types';


class AptosService {
  private aptos: Aptos | null = null;
  private accountAddress: AccountAddress | null = null;
  private contractAddress: string = config.aptos.contractAddress;
  private moduleName: string = 'AtomicSwapV5';

  async connect(): Promise<string> {
    if (!window.aptos) {
      throw new Error('Petra wallet not found. Please install Petra wallet.');
    }
    await window.aptos.connect();
    const accountInfo = await window.aptos.account();
    
    const aptosConfig = new AptosConfig({ 
      network: config.network === 'mainnet' ? Network.MAINNET : Network.TESTNET,
      clientConfig: {
        API_KEY: config.aptos.apiKey,
      }
    });
    this.aptos = new Aptos(aptosConfig);
    this.accountAddress = AccountAddress.fromString(accountInfo.address);
    
    // Initialize SwapBook resource if it doesn't exist
    await this.initializeSwapBook();
    
    return accountInfo.address;
  }

  async disconnect() {
    if (window.aptos) {
      window.aptos.disconnect();
    }
    this.aptos = null;
    this.accountAddress = null;
  }

  async getAddress(): Promise<string | null> {
    if (!this.accountAddress) return null;
    return this.accountAddress.toString();
  }

  async getBalance(): Promise<string> {
    if (!this.aptos || !this.accountAddress) throw new Error('Not connected');
    const resources = await this.aptos.getAccountResources({ 
      accountAddress: this.accountAddress 
    });
    const coinResource = resources.find((r: any) => 
      r.type.includes('::coin::CoinStore<0x1::aptos_coin::AptosCoin>')
    );
    return coinResource ? (coinResource.data as any).coin.value : '0';
  }

  get aptosInstance(): Aptos | null {
    return this.aptos;
  }

  get moduleNameInstance(): string {
    return this.moduleName;
  }

  get contractAddressInstance(): string {
    return this.contractAddress;
  }

  private async initializeSwapBook(): Promise<void> {
    if (!this.aptos || !this.accountAddress || !window.aptos) return;
    
    try {
      // Check if SwapBook resource already exists
      const resources = await this.aptos.getAccountResources({ 
        accountAddress: this.accountAddress 
      });
      const swapBookExists = resources.some((r: any) => 
        r.type === `${this.contractAddress}::${this.moduleName}::SwapBook`
      );
      
      if (!swapBookExists) {
        console.log('Initializing SwapBook resource...');
        const payload = {
          type: 'entry_function_payload',
          function: `${this.contractAddress}::${this.moduleName}::init`,
          type_arguments: [],
          arguments: [],
          max_gas_amount: 2000000, // Set explicit gas limit
          gas_unit_price: 100 // Set gas unit price
        };
        await window.aptos.signAndSubmitTransaction(payload);
        console.log('SwapBook resource initialized successfully');
      }
    } catch (error) {
      console.warn('Failed to initialize SwapBook resource:', error);
      // Don't throw error as this might already be initialized
    }
  }

  async initiateSwap(recipient: string, hashlock: string, timelock: number, amount: string): Promise<any> {
    if (!this.aptos || !this.accountAddress || !window.aptos) throw new Error('Not connected');
    
    // Convert hashlock from hex string to byte array for Move contract
    const hashlockBytes = this.hexToBytes(hashlock);
    
    // Convert amount to number (assuming it's in APT units)
    const amountNumber = Math.floor(parseFloat(amount) * 100000000); // Convert to octas (8 decimal places)
    
    const payload = {
      type: 'entry_function_payload',
      function: `${this.contractAddress}::${this.moduleName}::initiate_swap`,
      type_arguments: [],
      arguments: [hashlockBytes, timelock.toString(), recipient, amountNumber.toString()],
      max_gas_amount: 2000000, // Set explicit gas limit
      gas_unit_price: 100 // Set gas unit price
    };
    
    console.log('Initiating Aptos swap with payload:', payload);
    const tx = await window.aptos.signMessage({message: JSON.stringify(payload), nonce: '0'});
    return tx;
  }

 

  async refundSwap(hashlock: string): Promise<any> {
    if (!this.aptos || !this.accountAddress || !window.aptos) throw new Error('Not connected');
    
    // Convert hashlock to byte array
    const hashlockBytes = this.hexToBytes(hashlock);
    
    const payload = {
      type: 'entry_function_payload',
      function: `${this.contractAddress}::${this.moduleName}::refund_swap`,
      type_arguments: [],
      arguments: [this.bytesToHex(hashlockBytes)],
      max_gas_amount: 2000000, // Set explicit gas limit
      gas_unit_price: 100 // Set gas unit price
    };
    const tx = await window.aptos.signAndSubmitTransaction(payload);
    return tx;
  }

  async getSwap(hashlock: string): Promise<any> {
    if (!this.aptos) throw new Error('Not connected');
    try {
      // Convert hashlock to bytes for the contract call
      const hashlockBytes = this.hexToBytes(hashlock);
      
      // Call the get_swap view function directly
      const response = await this.aptos.view({
        payload: {
          function: `${this.contractAddress}::${this.moduleName}::get_swap`,
          typeArguments: [],
          functionArguments: [hashlockBytes]
        }
      });
      
      if (!response || !Array.isArray(response) || response.length < 6 || response[0] === '0x0') {
        return null;
      }

      return {
        initiator: response[0],
        recipient: response[1],
        amount: response[2]?.toString?.() || '0',
        timelock: response[3]?.toString?.() || '0',
        completed: response[4],
        refunded: response[5]
      };
    } catch (error) {
      console.error('Error getting swap:', error);
      return null;
    }
  }

  // Use Keccak-256 (same as Ethereum and Aptos Move contract)
  async generateHashlock(secret: string): Promise<string> {
    // Use ethers.js keccak256 directly on the secret (same as Solidity and Move sha3_256)
    const { ethers } = await import('ethers');
    return ethers.keccak256(secret);
  }

  generateSecret(): string {
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    // Add timestamp to ensure uniqueness
    const timestamp = Date.now().toString(16);
    const timestampArray = new TextEncoder().encode(timestamp);
    // Combine random bytes with timestamp
    const combinedArray = new Uint8Array(32);
    combinedArray.set(array);
    combinedArray.set(timestampArray.slice(0, 8), 24); // Add timestamp to last 8 bytes
    // Convert to hex string with 0x prefix (same as Ethereum service)
    return '0x' + Array.from(combinedArray).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Helper function to convert hex string to byte array
  private hexToBytes(hex: string): Uint8Array {
    // Remove 0x prefix if present
    const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
    
    // Convert hex string to Uint8Array
    const bytes = new Uint8Array(cleanHex.length / 2);
    for (let i = 0; i < cleanHex.length; i += 2) {
      bytes[i / 2] = parseInt(cleanHex.substr(i, 2), 16);
    }
    return bytes;
  }

  // Helper function to convert byte array to hex string
  private bytesToHex(bytes: Uint8Array): string {
    return '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }
}

export const aptosService = new AptosService();
export default AptosService; 