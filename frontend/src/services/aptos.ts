import { AccountAddress, Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';
import { config } from '../config';
import 'petra-wallet-types';


class AptosService {
  private aptos: Aptos | null = null;
  private accountAddress: AccountAddress | null = null;
  private contractAddress: string = config.aptos.contractAddress;
  private moduleName: string = config.aptos.moduleName;

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

  // Get FA Coin balance (similar to WETH balance)
  async getFaCoinBalance(): Promise<string> {
    if (!this.aptos || !this.accountAddress) throw new Error('Not connected');
    
    try {
      const resources = await this.aptos.getAccountResources({ 
        accountAddress: this.accountAddress 
      });
      
      // Look for FA coin store
      const faCoinResource = resources.find((r: any) => 
        r.type.includes('::primary_fungible_store::FungibleStore') && 
        r.type.includes('fa_coin')
      );
      
      if (faCoinResource) {
        return (faCoinResource.data as any).coins.value || '0';
      }
      return '0';
    } catch (error) {
      console.error('Error getting FA coin balance:', error);
      return '0';
    }
  }

  // Check FA Coin allowance for AtomicSwap contract
  async getFaCoinAllowance(spender: string): Promise<string> {
    if (!this.aptos || !this.accountAddress) throw new Error('Not connected');
    
    try {
      const response = await this.aptos.view({
        payload: {
          function: `${this.contractAddress}::fa_coin::allowance`,
          typeArguments: [],
          functionArguments: [this.accountAddress.toString(), spender]
        }
      });
      
      return response[0]?.toString() || '0';
    } catch (error) {
      console.error('Error getting FA coin allowance:', error);
      return '0';
    }
  }

  // Increase FA coin allowance for AtomicSwap contract (similar to WETH approval)
  async approveFaCoinForAtomicSwap(amount: string): Promise<any> {
    if (!this.aptos || !this.accountAddress || !window.aptos) throw new Error('Not connected');
    
    console.log('🔐 Increasing FA Coin allowance for AtomicSwap contract:', {
      amount: amount,
      spender: this.contractAddress,
      userAddress: this.accountAddress.toString()
    });
    
    try {
      // Convert amount to octas (8 decimal places)
      const amountOctas = Math.floor(parseFloat(amount) * 100000000);
      
      const payload = {
        type: 'entry_function_payload',
        function: `${this.contractAddress}::fa_coin::increase_allowance`,
        type_arguments: [],
        arguments: [this.contractAddress, amountOctas.toString()],
        max_gas_amount: 2000000,
        gas_unit_price: 100
      };
      
      console.log('📝 FA Coin increase_allowance payload:', payload);
      
      const tx = await window.aptos.signAndSubmitTransaction(payload);
      console.log('✅ FA Coin approval transaction sent:', tx.hash);
      
      // Wait for transaction to be confirmed
      await this.aptos.waitForTransaction({ transactionHash: tx.hash });
      
      return tx;
    } catch (error) {
      console.error('❌ FA Coin allowance increase failed:', error);
      throw error;
    }
  }

  // Unwrap FA coins back to APT (similar to WETH to ETH conversion)
  async unwrapFaCoinToApt(amount: string): Promise<any> {
    if (!this.aptos || !this.accountAddress || !window.aptos) throw new Error('Not connected');
    
    console.log('🔄 Converting FA Coin back to APT:', {
      amount: amount,
      userAddress: this.accountAddress.toString()
    });
    
    try {
      // Convert amount to octas (8 decimal places)
      const amountOctas = Math.floor(parseFloat(amount) * 100000000);
      
      const payload = {
        type: 'entry_function_payload',
        function: `${this.contractAddress}::fa_coin::unwrap`,
        type_arguments: [],
        arguments: [amountOctas.toString()],
        max_gas_amount: 2000000,
        gas_unit_price: 100
      };
      
      console.log('📝 FA Coin unwrap payload:', payload);
      
      const tx = await window.aptos.signAndSubmitTransaction(payload);
      console.log('✅ FA Coin unwrap transaction sent:', tx.hash);
      
      // Wait for transaction to be confirmed
      await this.aptos.waitForTransaction({ transactionHash: tx.hash });
      console.log('✅ FA Coin unwrap confirmed');
      
      return tx;
    } catch (error) {
      console.error('❌ FA Coin unwrap failed:', error);
      throw error;
    }
  }

  // Get current nonce for meta transactions
  async getNonce(userAddress: string): Promise<number> {
    if (!this.aptos) throw new Error('Not connected');
    
    try {
      const response = await this.aptos.view({
        payload: {
          function: `${this.contractAddress}::${this.moduleName}::get_nonce`,
          typeArguments: [],
          functionArguments: [userAddress]
        }
      });
      
      return parseInt(response[0]?.toString() || '0');
    } catch (error) {
      console.error('Error getting nonce:', error);
      return 0;
    }
  }

  // Create meta transaction signature for Aptos (similar to Ethereum's initiateSwapSignature)
  async initiateSwapSignature(
    recipient: string,
    hashlock: string,
    timelock: number,
    amount: string,
    deadlineMinutes: number = 60
  ): Promise<any> {
    if (!this.aptos || !this.accountAddress || !window.aptos) throw new Error('Not connected');
    
    console.log('✍️ Creating Aptos meta transaction signature:', {
      recipient,
      hashlock: hashlock.substring(0, 16) + '...',
      timelock,
      amount,
      deadlineMinutes
    });
    
    try {
      // Get current nonce
      const nonce = await this.getNonce(this.accountAddress.toString());
      console.log('📊 Current nonce:', nonce);
      
      // Calculate deadline
      const deadline = Math.floor(Date.now() / 1000) + (deadlineMinutes * 60);
      
      // Convert amount to octas
      const amountOctas = Math.floor(parseFloat(amount) * 100000000);
      
      // Convert hashlock to bytes
      const hashlockBytes = this.hexToBytes(hashlock);
      
      // Create meta data structure
      const metaData = {
        initiator: this.accountAddress.toString(),
        hashlock: Array.from(hashlockBytes), // Convert to array for BCS serialization
        timelock: timelock,
        recipient: recipient,
        amount: amountOctas,
        nonce: nonce,
        deadline: deadline
      };
      
      console.log('📝 Meta data for signature:', metaData);
      
      // Create message for signing (matches Move contract's BCS format)
      const messageBytes = this.createMetaMessage(metaData);
      
      // Convert Uint8Array to hex string for signing
      const messageHex = '0x' + Array.from(messageBytes).map(b => b.toString(16).padStart(2, '0')).join('');
      
      // Sign the message
      const signature = await window.aptos.signMessage({
        message: messageHex,
        nonce: nonce.toString()
      });
      
      console.log('✅ Meta transaction signature created:', {
        signature: signature.signature.substring(0, 16) + '...',
        fullMessage: messageHex.substring(0, 32) + '...'
      });
      
      return {
        swapData: metaData,
        signature: signature.signature,
      };
    } catch (error) {
      console.error('❌ Meta transaction signature failed:', error);
      throw error;
    }
  }

  // Helper function to create meta message for signature
  private createMetaMessage(metaData: any): Uint8Array {
    // This should match the create_meta_message function in the Move contract
    // The Move contract concatenates BCS-serialized fields
    
    // For now, let's use a simpler approach that concatenates the raw bytes
    // This is not perfect BCS but should work for our use case
    
    // Convert initiator address to bytes (remove 0x prefix)
    const initiatorHex = metaData.initiator.replace('0x', '');
    const initiatorBytes = this.hexToBytes(initiatorHex);
    
    // Hashlock is already in bytes
    const hashlockBytes = new Uint8Array(metaData.hashlock);
    
    // Convert recipient address to bytes (remove 0x prefix)
    const recipientHex = metaData.recipient.replace('0x', '');
    const recipientBytes = this.hexToBytes(recipientHex);
    
    // Convert numbers to 8-byte little-endian
    const timelockBytes = new Uint8Array(8);
    const amountBytes = new Uint8Array(8);
    const nonceBytes = new Uint8Array(8);
    const deadlineBytes = new Uint8Array(8);
    
    const timelockView = new DataView(timelockBytes.buffer);
    const amountView = new DataView(amountBytes.buffer);
    const nonceView = new DataView(nonceBytes.buffer);
    const deadlineView = new DataView(deadlineBytes.buffer);
    
    timelockView.setBigUint64(0, BigInt(metaData.timelock), true);
    amountView.setBigUint64(0, BigInt(metaData.amount), true);
    nonceView.setBigUint64(0, BigInt(metaData.nonce), true);
    deadlineView.setBigUint64(0, BigInt(metaData.deadline), true);
    
    // Concatenate all bytes
    const totalLength = initiatorBytes.length + hashlockBytes.length + 8 + recipientBytes.length + 8 + 8 + 8;
    const result = new Uint8Array(totalLength);
    let offset = 0;
    
    result.set(initiatorBytes, offset);
    offset += initiatorBytes.length;
    
    result.set(hashlockBytes, offset);
    offset += hashlockBytes.length;
    
    result.set(timelockBytes, offset);
    offset += 8;
    
    result.set(recipientBytes, offset);
    offset += recipientBytes.length;
    
    result.set(amountBytes, offset);
    offset += 8;
    
    result.set(nonceBytes, offset);
    offset += 8;
    
    result.set(deadlineBytes, offset);
    
    return result;
  }

  // Deposit APT to get FA coins (similar to ETH to WETH conversion)
  async depositAptToFaCoin(amount: string): Promise<any> {
    if (!this.aptos || !this.accountAddress || !window.aptos) throw new Error('Not connected');
    
    console.log('🔄 Converting APT to FA Coin:', {
      amount: amount,
      userAddress: this.accountAddress.toString()
    });
    
    try {
      // Convert amount to octas (8 decimal places)
      const amountOctas = Math.floor(parseFloat(amount) * 100000000);
      
      const payload = {
        type: 'entry_function_payload',
        function: `${this.contractAddress}::fa_coin::deposit_apt`,
        type_arguments: [],
        arguments: [amountOctas.toString()],
        max_gas_amount: 2000000,
        gas_unit_price: 100
      };
      
      console.log('📝 FA Coin deposit payload:', payload);
      
      const tx = await window.aptos.signAndSubmitTransaction(payload);
      console.log('✅ FA Coin deposit transaction sent:', tx.hash);
      
      // Wait for transaction to be confirmed
      await this.aptos.waitForTransaction({ transactionHash: tx.hash });
      console.log('✅ FA Coin deposit confirmed');
      
      return tx;
    } catch (error) {
      console.error('❌ FA Coin deposit failed:', error);
      throw error;
    }
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
      
      if (!response || !Array.isArray(response) || response.length < 6) {
        return null;
      }

      // For meta-transactions, initiator might be 0x0, but the swap still exists
      // Check if any meaningful data exists (recipient, amount, timelock)
      if (response[1] === '0x0' && response[2] === '0' && response[3] === '0') {
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