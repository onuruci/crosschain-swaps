import * as bitcoin from 'bitcoinjs-lib';
import axios from 'axios';
import config from './config';

class BitcoinClient {
    network: bitcoin.networks.Network
    rpcUrl: string

    constructor(network: bitcoin.networks.Network) {
        this.network = network
        this.rpcUrl = config.bitcoin.rpcUrl
    }

    async rpcCall(method:string, params: any[] = []) {
        try {
          const response = await axios.post(this.rpcUrl, {
            jsonrpc: '2.0',
            id: Math.random().toString(36),
            method: method,
            params: params
          });
          
          if (response.data.error) {
            throw new Error(`RPC Error: ${response.data.error.message}`);
          }
          
          return response.data.result;
        } catch (error: any) {
          console.error('RPC call failed:', error.message);
          throw error;
        }
    }

    public async getBlockCount() {
        const blockCount = await this.rpcCall("getblockcount")
        console.log(`block count: ${blockCount}`)
    }

    public async getBalance(address: string) {
        try {
            const response = await axios.get(`${this.rpcUrl}/address/${address}/utxo`);
            
            if (response.status !== 200) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }
            
            const utxos = response.data;
            
            // Sum all UTXO values to get total balance
            const totalBalance = utxos.reduce((sum: number, utxo: any) => {
                return sum + utxo.value;
            }, 0);
            
            console.log(`Balance for ${address}: ${totalBalance} satoshis`);
            return totalBalance;
        } catch (error: any) {
            console.error('Error getting balance:', error.message);
            throw error;
        }
    }

    public async getUTXOs(address: string) {
        try {
            const response = await axios.get(`${this.rpcUrl}/address/${address}/utxo`);
            
            if (response.status !== 200) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }
            
            const utxos = response.data;
            
            // Return UTXOs in the expected format
            return utxos.map((utxo: any): any => ({
                txid: utxo.txid,
                vout: utxo.vout,
                value: utxo.value, // Already in satoshis from the API
                scriptPubKey: utxo.scriptPubKey || '',
                status: utxo.status
            }));
        } catch (error: any) {
            console.error('Error getting UTXOs:', error.message);
            throw error;
        }
    }

    public async getRawTransaction(txid: string) {
      try {
          const response = await axios.get(`${this.rpcUrl}/tx/${txid}/hex`);
          
          if (response.status !== 200) {
              throw new Error(`API Error: ${response.status} ${response.statusText}`);
          }
          
          return response.data;
      } catch (error: any) {
          console.error('Error getting raw transaction:', error.message);
          throw error;
      }
  }

    async broadcastTransaction(rawTransaction: string): Promise<string> {
        try {
          const response = await axios.post(`${this.rpcUrl}/tx`, rawTransaction, {
            headers: {
              'Content-Type': 'text/plain'
            }
          });
          
          if (response.status !== 200) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
          }
          
          const txid = response.data;
          console.log('Transaction broadcasted successfully!');
          console.log('TXID:', txid);
          
          // Call the transaction URL to view details
          const txUrl = `https://mempool.space/testnet4/tx/${txid}`;
          console.log('🔗 Transaction URL:', txUrl);
          
          return txid;
        } catch (error: any) {
          console.error('Failed to broadcast transaction:', error.message);
          throw error;
        }
      }


    
}

export default BitcoinClient
