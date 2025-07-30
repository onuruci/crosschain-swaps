import { ethers } from 'ethers';
import { config } from '../config/config';

type InputType = {
  name: string
  value: any
  type: string
}

class EthereumService {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private contract: ethers.Contract;
  contractInterface: any

  constructor() {
    try {
      // Initialize provider and wallet
      this.provider = new ethers.JsonRpcProvider(config.ethereum.rpcUrl);
      
      // Check if private key is valid
      if (!config.ethereum.privateKey || config.ethereum.privateKey === 'your_ethereum_private_key_here') {
        throw new Error('Ethereum private key not configured');
      }
      
      this.wallet = new ethers.Wallet(config.ethereum.privateKey, this.provider);
      
      // Initialize contract
      this.contract = new ethers.Contract(
        config.ethereum.contractAddress,
        config.ethereum.contractABI,
        this.wallet
      );

      this.contractInterface = new ethers.Interface(config.ethereum.contractABI);
      
      console.log('✅ Ethereum service initialized successfully');
    } catch (error) {
      console.warn('⚠️ Ethereum service initialization failed:', error instanceof Error ? error.message : 'Unknown error');
      console.warn('Ethereum functionality will be disabled');
      // Set to null so we can check later
      this.provider = null as any;
      this.wallet = null as any;
      this.contract = null as any;
    }
  }

  formatValue(value: any, type: string) {
    if (typeof value === 'bigint' || (value && value._isBigNumber)) {
        return value.toString();
    }
    if (type === 'address') {
        return value;
    }
    if (type.includes('uint') && value) {
        return value.toString();
    }
    return value;
  }

  public async parseTx(txHash: string) {
    const receipt = await this.provider.getTransactionReceipt(txHash);
    if (!receipt) {
        throw new Error("Transaction not found or not mined yet");
    }
    const args: { [key: string]: string } = {};
    receipt.logs.forEach((log: any, index: any) => {
        try {
            // Filter by contract address if provided
            if (config.ethereum.contractAddress && log.address.toLowerCase() !== config.ethereum.contractAddress.toLowerCase()) {
                return;
            }

            const parsedLog = this.contractInterface.parseLog(log);

            console.log(parsedLog)
            
            console.log(`\n🎯 Event ${index + 1}: ${parsedLog.name}`);
            console.log(`Contract: ${log.address}`);
            console.log(`Log Index: ${log.logIndex}`);
            
            // Print all event arguments
            
            parsedLog.fragment.inputs.forEach((input: InputType, i: number) => {
                const value = parsedLog.args[i];
                args[input.name] = this.formatValue(value, input.type)
            });
            
        } catch (parseError) {
            // Log doesn't match this ABI - might be from different contract
            console.log(`Log ${index + 1}: Cannot parse with provided ABI`);
        }
    });

    return args
}

  public async initiateSwap(
    recipient: string,
    hashlock: string,
    timelock: number,
    amount: string
  ): Promise<string> {
    if (!this.contract) {
      throw new Error('Ethereum service not available');
    }
    
    try {
      console.log('🔗 Initiating Ethereum swap:', {
        recipient,
        hashlock: hashlock.substring(0, 16) + '...',
        timelock,
        amount
      });

      const tx = await this.contract.initiateSwap(
        recipient,
        hashlock,
        timelock,
        { value: ethers.parseEther(amount) }
      );

      const receipt = await tx.wait();
      console.log('✅ Ethereum swap initiated:', receipt.hash);
      
      return receipt.hash;
    } catch (error) {
      console.error('❌ Error initiating Ethereum swap:', error);
      throw error;
    }
  }

  public async completeSwap(
    hashlock: string,
    secret: string
  ): Promise<string> {
    try {
      console.log('🔗 Completing Ethereum swap:', {
        hashlock: hashlock.substring(0, 16) + '...',
        secret: secret.substring(0, 16) + '...'
      });

      const tx = await this.contract.completeSwap(hashlock, secret);
      const receipt = await tx.wait();
      
      console.log('✅ Ethereum swap completed:', receipt.hash);
      return receipt.hash;
    } catch (error) {
      console.error('❌ Error completing Ethereum swap:', error);
      throw error;
    }
  }

  public async refundSwap(hashlock: string): Promise<string> {
    try {
      console.log('🔗 Refunding Ethereum swap:', {
        hashlock: hashlock.substring(0, 16) + '...'
      });

      const tx = await this.contract.refundSwap(hashlock);
      const receipt = await tx.wait();
      
      console.log('✅ Ethereum swap refunded:', receipt.hash);
      return receipt.hash;
    } catch (error) {
      console.error('❌ Error refunding Ethereum swap:', error);
      throw error;
    }
  }

  public async getSwap(hashlock: string): Promise<any> {
    try {
      const swap = await this.contract.getSwap(hashlock);
      return {
        initiator: swap[0],
        recipient: swap[1],
        amount: swap[2].toString(),
        timelock: swap[3].toString(),
        completed: swap[4],
        refunded: swap[5]
      };
    } catch (error) {
      console.error('❌ Error getting Ethereum swap:', error);
      return null;
    }
  }

  public getAddress(): string {
    if (!this.wallet) {
      throw new Error('Ethereum service not available');
    }
    return this.wallet.address;
  }
}

const ethereumService = new EthereumService();
export default ethereumService; 