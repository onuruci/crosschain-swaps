"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const bitcoin = __importStar(require("bitcoinjs-lib"));
const ECPairFactory = require('ecpair').default;
const ecc = require('tiny-secp256k1');
const fs = require('fs');
const bitcoinScripts_1 = require("./bitcoinScripts");
const utils_1 = require("./utils");
const ECPair = ECPairFactory(ecc);
class Wallet {
    constructor(walletName, network, client) {
        this.address = "";
        this.privateKey = "";
        this.walletFiile = walletName + ".json";
        this.readWallet(this.walletFiile);
        this.network = network;
        this.client = client;
        this.keypair = ECPair.fromWIF(this.privateKey, this.network);
    }
    static async generateNewWallet(network, walletName) {
        try {
            const keyPair = ECPair.makeRandom({ network: network });
            const bufferPubkey = Buffer.from(keyPair.publicKey);
            const { address } = bitcoin.payments.p2pkh({
                pubkey: bufferPubkey,
                network: network,
            });
            const privateKey = keyPair.toWIF();
            console.log(`| Public Address | ${address} |`);
            console.log(`| Private Key | ${privateKey} |`);
            const wallet = {
                address: address,
                privateKey: privateKey
            };
            const walletJSON = JSON.stringify(wallet, null, 4);
            fs.writeFileSync(`${walletName}.json`, walletJSON);
            console.log(`Wallet created and saved to ${walletName}.json`);
        }
        catch (error) {
            console.log(error);
        }
    }
    static getPublicKeyHash(network, address) {
        const outputScript = bitcoin.address.toOutputScript(address, network);
        const chunks = bitcoin.script.decompile(outputScript);
        const pubKeyHash = chunks[2];
        return pubKeyHash;
    }
    async readWallet(walletFile) {
        try {
            const data = fs.readFileSync(walletFile);
            const wallet = JSON.parse(data);
            this.address = wallet.address;
            this.privateKey = wallet.privateKey;
        }
        catch (error) {
            console.log(error);
        }
    }
    getAddress() {
        return this.address;
    }
    getPubKey() {
        return this.keypair.publicKey;
    }
    async buildTransaction(toAddress, amount) {
        const keyPair = this.keypair;
        const bufferPubkey = Buffer.from(keyPair.publicKey);
        const fromAddress = bitcoin.payments.p2pkh({
            pubkey: bufferPubkey,
            network: this.network
        }).address;
        console.log(`Sending from: ${fromAddress}`);
        console.log(`Sending to: ${toAddress}`);
        console.log(`Amount: ${amount} satoshis`);
        const utxos = await this.client.getUTXOs(fromAddress);
        let totalInput = 0;
        const selectedUTXOs = [];
        if (utxos.length === 0) {
            throw new Error('No UTXOs found for the address');
        }
        for (const utxo of utxos) {
            selectedUTXOs.push(utxo);
            totalInput += utxo.value;
            // Estimate fee (rough calculation)
            const estimatedFee = 1000;
            if (totalInput >= amount + estimatedFee) {
                break;
            }
        }
        if (totalInput < amount) {
            throw new Error('Insufficient funds');
        }
        const estimatedFee = 500;
        const change = totalInput - amount - estimatedFee;
        console.log(`Total input: ${totalInput} satoshis`);
        console.log(`Estimated fee: ${estimatedFee} satoshis`);
        console.log(`Change: ${change} satoshis`);
        const psbt = new bitcoin.Psbt({ network: this.network });
        for (const utxo of selectedUTXOs) {
            const rawTx = await this.client.getRawTransaction(utxo.txid);
            psbt.addInput({
                hash: utxo.txid,
                index: utxo.vout,
                nonWitnessUtxo: Buffer.from(rawTx, 'hex')
            });
        }
        psbt.addOutput({
            address: toAddress,
            value: amount
        });
        if (change > 546) {
            psbt.addOutput({
                address: fromAddress,
                value: change,
            });
        }
        for (let i = 0; i < selectedUTXOs.length; i++) {
            psbt.signInput(i, {
                publicKey: Buffer.from(keyPair.publicKey),
                sign: (hash) => {
                    const signature = keyPair.sign(hash);
                    return Buffer.from(signature);
                },
            });
        }
        psbt.finalizeAllInputs();
        const rawTransaction = psbt.extractTransaction().toHex();
        await this.client.broadcastTransaction(rawTransaction);
    }
    async deployHashlockScript(payerPubKey, secret, lockTime, amount) {
        const bufferPubkey = Buffer.from(payerPubKey);
        const secretHash = (0, utils_1.getHash)(secret);
        const network = this.network;
        const hashlockScript = (0, bitcoinScripts_1.createHashlockScriptP2Address)(secretHash, lockTime, payerPubKey);
        const p2wsh = bitcoin.payments.p2wsh({
            redeem: { output: hashlockScript },
            network
        });
        console.log('Hashlock Address:', p2wsh.address);
        console.log('Script (hex):', hashlockScript.toString('hex'));
        await this.buildTransaction(p2wsh.address || "", amount);
    }
    async spendHashlockWithSecret(hashlockTxid, hashlockVout, recipientAddress, secret, lockTime, amount, recepientPkh) {
        const keyPair = this.keypair;
        const bufferPubkey = Buffer.from(keyPair.publicKey);
        const network = this.network;
        const secretHash = (0, utils_1.getHash)(secret);
        console.log('Secret (hex):', secret);
        console.log('Secret Hash (hex):', secretHash.toString('hex'));
        const hashlockScript = (0, bitcoinScripts_1.createHashlockScriptP2Address)(secretHash, lockTime, recepientPkh);
        const fee = 1000;
        const hashType = bitcoin.Transaction.SIGHASH_ALL;
        const tx = new bitcoin.Transaction();
        tx.version = 2;
        tx.addInput(Buffer.from(hashlockTxid, 'hex').reverse(), hashlockVout);
        const outputScript = bitcoin.address.toOutputScript(recipientAddress, network);
        tx.addOutput(outputScript, amount - fee);
        const signatureHash = tx.hashForWitnessV0(0, hashlockScript, amount, hashType);
        const signature = keyPair.sign(signatureHash);
        const bufferSig = Buffer.from(signature);
        const derSignature = bitcoin.script.signature.encode(bufferSig, hashType);
        const secretBuffer = Buffer.from(secret);
        if (!bitcoin.script.signature.decode(derSignature)) {
            throw new Error('Failed to create canonical DER signature');
        }
        const witness = [
            derSignature,
            secretBuffer,
            Buffer.from([1]),
            hashlockScript
        ];
        tx.ins[0].witness = witness;
        const txHex = tx.toHex();
        this.client.broadcastTransaction(txHex);
    }
}
exports.default = Wallet;
