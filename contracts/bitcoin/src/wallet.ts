import * as bitcoin from 'bitcoinjs-lib';
import BitcoinClient from './client';
const ECPairFactory = require('ecpair').default;
const ecc = require('tiny-secp256k1');
const fs = require('fs');
import { ECPairInterface } from 'ecpair';
import { createHashlockScript, createHashlockScriptP2Address } from './bitcoinScripts';
import { getHash } from './utils';
import config from './config';

const ECPair = ECPairFactory(ecc);

class Wallet {
    address: string = ""
    privateKey: string = ""
    network: bitcoin.networks.Network
    client: BitcoinClient
    keypair: ECPairInterface

    constructor(network: bitcoin.networks.Network, client: BitcoinClient) {
        this.privateKey = config.bitcoin.privateKey
        this.address = config.bitcoin.address
        this.network = network
        this.client = client
        this.keypair = ECPair.fromWIF(this.privateKey, this.network);
    }

    public static async generateNewWallet(network: bitcoin.networks.Network, walletName: string) {
        try {
            const keyPair = ECPair.makeRandom({ network: network });
            const bufferPubkey = Buffer.from(keyPair.publicKey);
            const { address } = bitcoin.payments.p2pkh({
                pubkey: bufferPubkey,
                network: network,
              });
            const privateKey = keyPair.toWIF()
    
            console.log(`| Public Address | ${address} |`)
            console.log(`| Private Key | ${privateKey} |`)
    
            const wallet = {
                address: address,
                privateKey: privateKey
            };
    
            const walletJSON = JSON.stringify(wallet, null, 4);
    
            fs.writeFileSync(`${walletName}.json`, walletJSON);
    
            console.log(`Wallet created and saved to ${walletName}.json`);
        } catch (error) {
            console.log(error)
        }
    }

    public static getPublicKeyHash(network: bitcoin.networks.Network, address: string) {
        const outputScript = bitcoin.address.toOutputScript(address, network);
        const chunks = bitcoin.script.decompile(outputScript);

        const pubKeyHash = chunks![2]

        return pubKeyHash
    }

    public async readWallet(walletFile: string) {
        try {
            const data = fs.readFileSync(walletFile)
            const wallet = JSON.parse(data)
            this.address = wallet.address
            this.privateKey = wallet.privateKey
        } catch (error) {
            console.log(error)
        }
    }

    public getAddress() {
        return this.address
    }

    public getPubKey() {
        return Buffer.from(this.keypair.publicKey)
    }

    public async buildTransaction(
        toAddress: string,
        amount: number
    ) {
        const keyPair = this.keypair;
        const bufferPubkey = Buffer.from(keyPair.publicKey);
        const fromAddress = bitcoin.payments.p2pkh({ 
            pubkey: bufferPubkey, 
            network: this.network 
        }).address!;

        console.log(`Sending from: ${fromAddress}`);
        console.log(`Sending to: ${toAddress}`);
        console.log(`Amount: ${amount} satoshis`);

        const utxos :any = await this.client.getUTXOs(fromAddress);

        let totalInput = 0;
        const selectedUTXOs: any[] = [];

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

        const estimatedFee = 1000;
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

        await this.client.broadcastTransaction(rawTransaction)
    }

    public async deployHashlockScript(receipentPubKey: any, secretHash: Buffer, lockTime: number, amount: number) {
        const network = this.network

        const hashlockScript = createHashlockScript(secretHash, lockTime, receipentPubKey, this.getPubKey());

        const p2wsh = bitcoin.payments.p2wsh({
            redeem: { output: hashlockScript },
            network
        });
        
        console.log("Deploying new hashlock script")
        console.log('Hashlock Address:', p2wsh.address);
        console.log('Script (hex):', hashlockScript.toString('hex'));
        
        const txid = await this.buildTransaction(p2wsh.address || "", amount)

        const res  = {
            txid: txid,
            vout: 0,
            address: p2wsh.address || "",
            lockerPubKey: this.getPubKey().toString('hex'),
            hash: secretHash.toString('hex')
        }
        
        return res
    }

    public async spendHashlockWithSecret(
        hashlockTxid: any, 
        hashlockVout: any, 
        recipientAddress: any,
        secret:string,
        lockTime: number,
        amount : any,
        senderPubKey: any
    ) {
        const keyPair = this.keypair;
        const bufferPubkey = Buffer.from(keyPair.publicKey);
        const network = this.network
        const secretHash = getHash(Buffer.from(secret));

        console.log('Secret (hex):', secretHash);
        console.log('Secret Hash (hex):', secretHash.toString('hex'));

        const hashlockScript = createHashlockScript(secretHash, lockTime, this.getPubKey(), senderPubKey);

        const fee = 1000;

        const hashType = bitcoin.Transaction.SIGHASH_ALL;
        const tx = new bitcoin.Transaction();
        tx.version = 2;
        tx.addInput(Buffer.from(hashlockTxid, 'hex').reverse(), hashlockVout);

        const outputScript = bitcoin.address.toOutputScript(recipientAddress, network);
        tx.addOutput(outputScript, amount-fee);

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
        
        this.client.broadcastTransaction(txHex)
    }
    
}

export default Wallet
