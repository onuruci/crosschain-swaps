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
        console.log(params)
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
            let params = ["start", 
            [{
                "desc": `addr(${address})`
            }]]
            const balance = await this.rpcCall("scantxoutset", params)
            console.log(balance)
            return balance
        } catch (error: any) {
            console.error('Error getting balance:', error.message);
        }
    }

    public async getUTXOs(address: string) {
        try {
            let params = ["start", 
            [{
                "desc": `addr(${address})`
            }]]
            const utxos = await this.rpcCall("scantxoutset", params)
            return utxos.unspents.map((utxo: any): any => ({
                txid: utxo.txid,
                vout: utxo.vout,
                value: Math.round(utxo.amount * 100000000), // Convert to satoshis
                scriptPubKey: utxo.scriptPubKey
              }));
        } catch (error: any) {
            console.error('Error getting balance:', error.message);
        }
    }

    public async getRawTransaction(txid: string) {
        const rawTx = await this.rpcCall('getrawtransaction', [txid]);
        return rawTx
    }

    async broadcastTransaction(rawTransaction: string): Promise<string> {
        try {
          const txid = await this.rpcCall('sendrawtransaction', [rawTransaction]);
          console.log('Transaction broadcasted successfully!');
          console.log('TXID:', txid);
          return txid;
        } catch (error: any) {
          console.error('Failed to broadcast transaction:', error.message);
          throw error;
        }
      }
    
}

export default BitcoinClient
