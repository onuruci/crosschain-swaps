"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
class BitcoinClient {
    constructor(network) {
        this.rpcUser = 'bitcoin';
        this.rpcPassword = 'secretpassword';
        this.rpcHost = 'localhost';
        this.rpcPort = 18443;
        this.network = network;
        this.rpcUrl = `http://${this.rpcUser}:${this.rpcPassword}@${this.rpcHost}:${this.rpcPort}`;
    }
    async rpcCall(method, params = []) {
        console.log(params);
        try {
            const response = await axios_1.default.post(this.rpcUrl, {
                jsonrpc: '2.0',
                id: Math.random().toString(36),
                method: method,
                params: params
            });
            if (response.data.error) {
                throw new Error(`RPC Error: ${response.data.error.message}`);
            }
            return response.data.result;
        }
        catch (error) {
            console.error('RPC call failed:', error.message);
            throw error;
        }
    }
    async getBlockCount() {
        const blockCount = await this.rpcCall("getblockcount");
        console.log(`block count: ${blockCount}`);
    }
    async getBalance(address) {
        try {
            let params = ["start",
                [{
                        "desc": `addr(${address})`
                    }]];
            const balance = await this.rpcCall("scantxoutset", params);
            console.log(balance);
            return balance;
        }
        catch (error) {
            console.error('Error getting balance:', error.message);
        }
    }
    async getUTXOs(address) {
        try {
            let params = ["start",
                [{
                        "desc": `addr(${address})`
                    }]];
            const utxos = await this.rpcCall("scantxoutset", params);
            return utxos.unspents.map((utxo) => ({
                txid: utxo.txid,
                vout: utxo.vout,
                value: Math.round(utxo.amount * 100000000), // Convert to satoshis
                scriptPubKey: utxo.scriptPubKey
            }));
        }
        catch (error) {
            console.error('Error getting balance:', error.message);
        }
    }
    async getRawTransaction(txid) {
        const rawTx = await this.rpcCall('getrawtransaction', [txid]);
        return rawTx;
    }
    async broadcastTransaction(rawTransaction) {
        try {
            const txid = await this.rpcCall('sendrawtransaction', [rawTransaction]);
            console.log('Transaction broadcasted successfully!');
            console.log('TXID:', txid);
            return txid;
        }
        catch (error) {
            console.error('Failed to broadcast transaction:', error.message);
            throw error;
        }
    }
}
exports.default = BitcoinClient;
