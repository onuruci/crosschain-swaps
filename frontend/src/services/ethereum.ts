import { ethers } from 'ethers';
import { config } from '../config';
import { ATOMIC_SWAP_ABI, WETH_ABI } from '../config/contract-abi';

class EthereumService {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.JsonRpcSigner | null = null;
  // Contract address from configuration
  private contractAddress: string = config.ethereum.contractAddress;
  private wethAddress: string = config.ethereum.wethAddress;
  public contract: ethers.Contract | null = null;
  public wethContract: ethers.Contract | null = null;

  async connect(): Promise<string> {
    if (!window.ethereum) {
      throw new Error('MetaMask not found. Please install MetaMask.');
    }
    
    this.provider = new ethers.BrowserProvider(window.ethereum);
    this.signer = await this.provider.getSigner();
    
    // Check network
    const network = await this.provider.getNetwork();
    console.log('Connected to network:', {
      chainId: network.chainId.toString(),
      name: network.name
    });
    
    // Verify we're on the correct network (Hardhat localhost)
    if (network.chainId !== BigInt(31337)) {
      console.warn('⚠️ Warning: Not connected to Hardhat localhost (Chain ID 31337)');
      console.warn('Current Chain ID:', network.chainId.toString());
    }
    
    
    this.contract = new ethers.Contract(this.contractAddress, ATOMIC_SWAP_ABI, this.signer);
    this.wethContract = new ethers.Contract(this.wethAddress, WETH_ABI, this.signer);
    
    const address = await this.signer.getAddress();
    return address;
  }

  async disconnect() {
    this.provider = null;
    this.signer = null;
    this.contract = null;
  }

  async getAddress(): Promise<string | null> {
    if (!this.signer) return null;
    return await this.signer.getAddress();
  }

  async getBalance(): Promise<string> {
    if (!this.signer) throw new Error('Not connected');
    const balance = await this.signer.provider.getBalance(await this.signer.getAddress());
    return ethers.formatEther(balance);
  }

  async getWethBalance(): Promise<string> {
    if (!this.wethContract || !this.signer) throw new Error('Not connected');
    const address = await this.signer.getAddress();
    const balance = await this.wethContract.balanceOf(address);
    return ethers.formatEther(balance);
  }

  async convertEthToWeth(amount: string): Promise<any> {
    if (!this.wethContract || !this.signer) throw new Error('Not connected');
    
    const amountWei = ethers.parseEther(amount);
    console.log('🔄 Converting ETH to WETH:', {
      amount: amount,
      amountWei: amountWei.toString()
    });
    
    try {
      const tx = await this.wethContract.deposit({ value: amountWei });
      console.log('✅ WETH deposit transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('✅ WETH deposit confirmed:', receipt?.blockNumber);
      return receipt;
    } catch (error) {
      console.error('❌ WETH deposit failed:', error);
      throw error;
    }
  }

  async approveWethForAtomicSwap(amount: string): Promise<any> {
    if (!this.wethContract || !this.contract) throw new Error('Not connected');
    
    const amountWei = ethers.parseEther(amount);
    console.log('🔐 Approving WETH for AtomicSwap contract:', {
      amount: amount,
      amountWei: amountWei.toString(),
      contractAddress: this.contractAddress
    });
    
    try {
      const tx = await this.wethContract.approve(this.contractAddress, amountWei);
      console.log('✅ WETH approval transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('✅ WETH approval confirmed:', receipt?.blockNumber);
      return receipt;
    } catch (error) {
      console.error('❌ WETH approval failed:', error);
      throw error;
    }
  }

  async checkWethAllowance(owner: string, spender: string): Promise<string> {
    if (!this.wethContract) throw new Error('Not connected');
    const allowance = await this.wethContract.allowance(owner, spender);
    return ethers.formatEther(allowance);
  }

  get providerInstance(): ethers.BrowserProvider | null {
    return this.provider;
  }

  async initiateSwapSignature(
    recipient: string, 
    hashlock: string, 
    timelock: number, 
    amount: string,
    deadlineMinutes:number = 60,
    ): Promise<any> {
      if (!this.contract || !this.signer || !this.provider) throw new Error('Not connected');
    const types = {
      InitiateSwap: [
        { name: 'initiator', type: 'address' },
        { name: 'hashlock', type: 'bytes32' },
        { name: 'timelock', type: 'uint256' },
        { name: 'recipient', type: 'address' },
        { name: 'token', type: 'address' },
        { name: 'amount', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' }
      ]
    }

    const domain = {
      name: 'AtomicSwap',
      version: '1',
      chainId: 0,
      verifyingContract: await this.contract.getAddress()
    };

    const network = await this.provider.getNetwork();
    domain.chainId = Number(network.chainId);


    const deadline = Math.floor(Date.now() / 1000) + (deadlineMinutes * 60);

    const initiator = await this.getAddress();
    console.log("THİS ADDRESS:  ", initiator)
    //const nonce = await this.contract.nonces(initiator);
    const nonce = 0;

    console.log("NONCE: ", nonce)

    const swapData = {
      initiator: initiator,
      hashlock: hashlock,
      timelock: timelock,
      recipient: recipient,
      token: this.wethAddress, // Use WETH address instead of ETH
      amount: ethers.parseEther(amount.toString()).toString(),
      nonce: nonce,
      deadline: deadline
    };

    const signature = await this.signer.signTypedData(domain, types, swapData);

    console.log("Signature results")
    console.log(swapData)
    console.log(signature)
    console.log(timelock)
    console.log(deadline)

    return {
        swapData: swapData,
        signature: signature,
    };

  }

  async completeSwap(hashlock: string, secret: string): Promise<any> {
    if (!this.contract) throw new Error('Not connected');
    // The secret is a hex string, convert it to bytes32
    const secretBytes32 = ethers.zeroPadValue(secret, 32);
    const tx = await this.contract.completeSwap(hashlock, secretBytes32);
    return await tx.wait();
  }

  async completeSwapAsInitiator(hashlock: string, secret: string): Promise<any> {
    if (!this.contract) throw new Error('Not connected');
    // The secret is a hex string, convert it to bytes32
    const secretBytes32 = ethers.zeroPadValue(secret, 32);
    const tx = await this.contract.completeSwapAsInitiator(hashlock, secretBytes32);
    return await tx.wait();
  }

  async refundSwap(hashlock: string): Promise<any> {
    if (!this.contract) throw new Error('Not connected');
    const tx = await this.contract.refundSwap(hashlock);
    return await tx.wait();
  }

  async getSwap(hashlock: string): Promise<any> {
    if (!this.contract) throw new Error('Not connected');
    return await this.contract.getSwap(hashlock);
  }

  // Generate hashlock using keccak256 (same as Solidity)
  generateHashlock(secret: string): string {
    // The secret is a hex string, convert it to bytes and hash
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
    const secret = ethers.hexlify(combinedArray);
    
    console.log('🔑 Generated new secret:', {
      secret: secret.substring(0, 16) + '...',
      timestamp: new Date().toISOString(),
      randomBytes: Array.from(array.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join('')
    });
    
    return secret;
  }

  // Clear stored hashlocks from localStorage
  private clearStoredHashlocks(): void {
    const keys = Object.keys(localStorage);
    const hashlockKeys = keys.filter(key => key.startsWith('swap_secret_') || key.includes('hashlock'));
    hashlockKeys.forEach(key => {
      console.log('🗑️ Clearing stored hashlock:', key);
      localStorage.removeItem(key);
    });
  }

  // Debug function to check hashlock status
  async debugHashlock(hashlock: string): Promise<void> {
    if (!this.contract) throw new Error('Not connected');
    
    try {
      console.log('🔍 Debugging hashlock:', hashlock);
      
      // Check if hashlock is used
      const hashlockUsed = await this.contract.hashlockUsed(hashlock);
      console.log('Hashlock used:', hashlockUsed);
      
      // Try to get swap details
      try {
        const swap = await this.contract.getSwap(hashlock);
        console.log('Swap details:', swap);
      } catch (error) {
        console.log('No swap found for this hashlock');
      }
      
      // Check if we can complete or refund
      try {
        const canComplete = await this.contract.canComplete(hashlock);
        const canRefund = await this.contract.canRefund(hashlock);
        console.log('Can complete:', canComplete);
        console.log('Can refund:', canRefund);
      } catch (error) {
        console.log('Cannot check completion/refund status');
      }
      
      // List all stored hashlocks in localStorage
      console.log('📋 Stored hashlocks in localStorage:');
      const keys = Object.keys(localStorage);
      const hashlockKeys = keys.filter(key => key.startsWith('swap_secret_') || key.includes('hashlock'));
      hashlockKeys.forEach(key => {
        const value = localStorage.getItem(key);
        console.log(`  ${key}: ${value ? value.substring(0, 16) + '...' : 'null'}`);
      });
    } catch (error) {
      console.error('Error debugging hashlock:', error);
    }
  }
}

declare global {
  interface Window {
    ethereum?: any;
  }
}

export const ethereumService = new EthereumService();
export default EthereumService; 