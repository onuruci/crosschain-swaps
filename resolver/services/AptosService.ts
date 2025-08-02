import { Account, AccountAddress, Aptos, AptosConfig, Network, Ed25519PrivateKey } from '@aptos-labs/ts-sdk';
import { config } from '../config/config';

class AptosService {
  private aptos: Aptos | null = null;
  private accountAddress: AccountAddress | null = null;
  private contractAddress: string = config.aptos.contractAddress;
  private moduleName: string = 'AtomicSwapTuna';

  constructor() {
    this.initializeAptosClient();
  }

  private initializeAptosClient(): void {
    try {
      const aptosConfig = new AptosConfig({ 
        network: config.network === 'mainnet' ? Network.MAINNET : Network.TESTNET,
        clientConfig: {
          API_KEY: config.aptos.apiKey,
        }
      });
      this.aptos = new Aptos(aptosConfig);
      
      // Check if private key is configured
      if (!config.aptos.privateKey || config.aptos.privateKey === 'your_aptos_private_key_here') {
        throw new Error('Aptos private key not configured');
      }
      
      // Create account from private key
      const privateKeyBytes = new Uint8Array(Buffer.from(config.aptos.privateKey.replace('0x', ''), 'hex'));
      this.accountAddress = AccountAddress.fromString(config.aptos.accountAddress);
      
      if (config.aptos.apiKey) {
        console.log('🔑 Using Aptos API key for requests');
      } else {
        console.log('⚠️ No Aptos API key configured - may hit rate limits');
      }
      
      console.log('✅ Aptos service initialized successfully');
    } catch (error) {
      console.warn('⚠️ Aptos service initialization failed:', error instanceof Error ? error.message : 'Unknown error');
      console.warn('Aptos functionality will be disabled');
      // Set to null so we can check later
      this.aptos = null;
      this.accountAddress = null;
    }
  }

  async initiateSwap(recipient: string, hashlock: string, timelock: number, amount: string): Promise<any> {
    if (!this.aptos || !this.accountAddress) throw new Error('Not connected');
    
    // Convert hashlock from hex string to byte array for Move contract
    const hashlockBytes = this.hexToBytes(hashlock);
    
    // Convert amount to number (assuming it's in APT units)
    const amountNumber = Math.floor(parseFloat(amount) * 100000000); // Convert to octas (8 decimal places)
    
    console.log("\n=== 1. Building the transaction ===");
    
    // Create account from private key
    const privateKey = new Ed25519PrivateKey(config.aptos.privateKey);
    const account = Account.fromPrivateKey({ privateKey });
    console.log(account.accountAddress);
    
    // Build the transaction
    const transaction = await this.aptos.transaction.build.simple({
      sender: account.accountAddress,
      data: {
        function: `${this.contractAddress}::${this.moduleName}::initiate_swap`,
        functionArguments: [hashlockBytes, timelock.toString(), recipient, amountNumber.toString()],
      },
    });
    console.log("Transaction built successfully");
    
    // Simulate the transaction
    const [simulationResult] = await this.aptos.transaction.simulate.simple({
      signerPublicKey: account.publicKey,
      transaction,
    });
    
    // Sign the transaction
    const senderAuthenticator = this.aptos.transaction.sign({
      signer: account,
      transaction,
    });
    
    // Submit the transaction
    const pendingTransaction = await this.aptos.transaction.submit.simple({
      transaction,
      senderAuthenticator,
    });
    
    console.log('✅ Aptos swap initiated:', pendingTransaction.hash);
    return pendingTransaction;
  }

  async initiateSwapSignature(swapData: any, signature: string): Promise<any> {
    if (!this.aptos || !this.accountAddress) throw new Error('Not connected');
    
    // Convert hashlock to byte array for Move contract
    // swapData.hashlock might already be a Uint8Array from frontend
    const hashlockBytes = Array.isArray(swapData.hashlock) 
      ? new Uint8Array(swapData.hashlock) 
      : this.hexToBytes(swapData.hashlock);
    
    const privateKey = new Ed25519PrivateKey(config.aptos.privateKey);
    const account = Account.fromPrivateKey({ privateKey });
    console.log(account.accountAddress);
    
    // Build the transaction for initiate_swap_meta
    const transaction = await this.aptos.transaction.build.simple({
      sender: account.accountAddress,
      data: {
        function: `${this.contractAddress}::${this.moduleName}::initiate_swap_meta`,
        functionArguments: [
          swapData.initiator,
          hashlockBytes,
          swapData.timelock.toString(),
          swapData.recipient,
          swapData.amount,
          swapData.nonce.toString(),
          swapData.deadline.toString(),
          this.hexToBytes(signature)
        ],
      },
    });
    console.log("Meta transaction built successfully");
    
    // Simulate the transaction
    const [simulationResult] = await this.aptos.transaction.simulate.simple({
      signerPublicKey: account.publicKey,
      transaction,
    });
    
    // Sign the transaction
    const senderAuthenticator = this.aptos.transaction.sign({
      signer: account,
      transaction,
    });
    
    // Submit the transaction
    const pendingTransaction = await this.aptos.transaction.submit.simple({
      transaction,
      senderAuthenticator,
    });
    
    console.log('✅ Aptos meta swap initiated:', pendingTransaction);
    return pendingTransaction;
  }

  async completeSwap(initiator: string, hashlock: string, secret: string): Promise<any> {
    if (!this.aptos || !this.accountAddress) throw new Error('Not connected');
    
    try {
      // Convert hashlock and secret to byte arrays
      const hashlockBytes = this.hexToBytes(hashlock);
      const secretBytes = this.hexToBytes(secret);
      
      console.log('Completing Aptos swap directly...');
      console.log("\n=== 1. Building the transaction ===");
      
      // Create account from private key
      const privateKey = new Ed25519PrivateKey(config.aptos.privateKey);
      const account = Account.fromPrivateKey({ privateKey });
      
      // Build the transaction
      const transaction = await this.aptos.transaction.build.simple({
        sender: account.accountAddress,
        data: {
          function: `${this.contractAddress}::${this.moduleName}::complete_swap`,
          functionArguments: [hashlockBytes, secretBytes],
        },
      });
      console.log("Transaction built successfully");
      
      // Simulate the transaction
      const [simulationResult] = await this.aptos.transaction.simulate.simple({
        signerPublicKey: account.publicKey,
        transaction,
      });
      
      // Sign the transaction
      const senderAuthenticator = this.aptos.transaction.sign({
        signer: account,
        transaction,
      });
      
      // Submit the transaction
      const pendingTransaction = await this.aptos.transaction.submit.simple({
        transaction,
        senderAuthenticator,
      });
      
      console.log('✅ Aptos swap completed:', pendingTransaction.hash);
      return pendingTransaction;
    } catch (error) {
      console.error('Error completing swap:', error);
      throw error;
    }
  }

  async refundSwap(hashlock: string): Promise<any> {
    if (!this.aptos || !this.accountAddress) throw new Error('Not connected');
    
    // Convert hashlock to byte array
    const hashlockBytes = this.hexToBytes(hashlock);
    
    console.log("\n=== 1. Building the transaction ===");
    
    // Create account from private key
    const privateKey = new Ed25519PrivateKey(config.aptos.privateKey);
    const account = Account.fromPrivateKey({ privateKey });
    
    // Build the transaction
    const transaction = await this.aptos.transaction.build.simple({
      sender: account.accountAddress,
      data: {
        function: `${this.contractAddress}::${this.moduleName}::refund_swap`,
        functionArguments: [hashlockBytes],
      },
    });
    console.log("Transaction built successfully");
    
    // Simulate the transaction
    const [simulationResult] = await this.aptos.transaction.simulate.simple({
      signerPublicKey: account.publicKey,
      transaction,
    });
    
    // Sign the transaction
    const senderAuthenticator = this.aptos.transaction.sign({
      signer: account,
      transaction,
    });
    
    // Submit the transaction
    const pendingTransaction = await this.aptos.transaction.submit.simple({
      transaction,
      senderAuthenticator,
    });
    
    console.log('✅ Aptos swap refunded:', pendingTransaction.hash);
    return pendingTransaction;
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

  async getAddress(): Promise<string | null> {
    if (!this.accountAddress) return null;
    return this.accountAddress.toString();
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
}

const aptosService = new AptosService();
export default aptosService; 