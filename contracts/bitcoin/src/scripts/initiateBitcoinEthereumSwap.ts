import * as bitcoin from 'bitcoinjs-lib';
import axios from 'axios';
import Wallet from '../wallet';
import BitcoinClient from '../client';
import { getHash } from '../utils';
import config from '../config';
import {ethers} from "ethers"
const crypto = require('crypto');

const NETWORK = config.bitcoin.network

const RESOLVER_URL = config.resolverUrl

const ETHEREUM_RPC_URL = config.ethereum.rpcUrl

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Calculate SHA256 hash from existing secret hex string (TypeScript version)
 */
async function calculateHashFromSecret(secret: string): Promise<string> {    
    if (!secret.startsWith('0x')) {
        throw new Error('Secret must start with 0x');
    }
    
    if (secret.length !== 66) {
        throw new Error('Secret must be exactly 32 bytes (64 hex chars + 0x)');
    }
    
    const hexString = secret.slice(2);
    const secretBytes = new Uint8Array(32);
    
    for (let i = 0; i < 32; i++) {
        const byteHex = hexString.substr(i * 2, 2);
        secretBytes[i] = parseInt(byteHex, 16);
    }
    
    const hashBuffer = await crypto.subtle.digest('SHA-256', secretBytes);
    
    const secretHash = '0x' + Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    
    return secretHash;
}

async function generateSecretAndHashlock() {
    // Generate a random secret (32 bytes)
    const secretBytes = new Uint8Array(32);
    crypto.getRandomValues(secretBytes);
    
    // 2. Hash raw bytes
    const hashBuffer = await crypto.subtle.digest('SHA-256', secretBytes);
    
    // 3. Convert to hex for ethers
    const secret = '0x' + Array.from(secretBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    const hashlock = '0x' + Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    
    
    return { secret: secret, secretHash: hashlock };
}


const USER_ETHEREUM_ADDRESS = config.ethereum.address
const LOCK_TIME = 114
const BITCOIN_AMOUNT = 100000000 // satoshis
const ETHEREUM_AMOUNT = "1.0" // 1 ETH in wei
const ETHEREUM_TIMELOCK = 110600 // 1 hour in seconds

function formatBytes(bytes: Uint8Array) {
    return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function logBtcBalance(client:any, address: string, name: string) {
    let walletBalance = await client.getBalance(address)
    console.log(`${name} balance BTC:    \t`, walletBalance.total_amount)
}

async function logEthBalance(provider: any, address: string, name: string) {
    let weiBalance = await provider.getBalance(address) 
    console.log(`${name} balance ETH: \t`, parseFloat(ethers.formatEther(weiBalance.toString())))
}

async function main() {
    const client = new BitcoinClient(NETWORK)
    const wallet = new Wallet(NETWORK, client)
    const provider = new ethers.JsonRpcProvider(ETHEREUM_RPC_URL);

    console.log('🚀 Starting Bitcoin to Ethereum swap...')    
    console.log(`📱 User Bitcoin address: ${wallet.getAddress()}`)

    // Get resolver's public key
    console.log('🔑 Getting resolver public key...')
    let res = await axios.get(RESOLVER_URL + "bitcoin-pubkey")
    const resolverPubKey = Buffer.from(res.data.pubkey, 'hex')

    const resolverBitcoinAddress = res.data.address
    const resolverEthAddress = res.data.eth_address

    await logBtcBalance(client, wallet.address, "Maker")
    await logEthBalance(provider, config.ethereum.address, "Maker")
    await logBtcBalance(client, resolverBitcoinAddress, "Resolver")
    await logEthBalance(provider, resolverEthAddress, "Resolver")

    // Deploy Bitcoin HTLC
    console.log('🔒 Deploying Bitcoin HTLC...')
    const { secret, secretHash } = await generateSecretAndHashlock();

    console.log(secret)
    console.log(secretHash)
    console.log(await calculateHashFromSecret(secret))
    const hex = secret.slice(2);
    let bytes = new Uint8Array(hex.match(/.{2}/g)?.map(byte => parseInt(byte, 16)) || []);
    const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
    const hashBytes = new Uint8Array(hashBuffer);
    console.log(formatBytes(hashBytes))
    
    
    
    const { txid, vout, address, lockerPubKey, hash } = await wallet.deployHashlockScript(
        resolverPubKey, 
        secretHash, 
        LOCK_TIME, 
        BITCOIN_AMOUNT
    )
    
    console.log(`✅ Bitcoin HTLC deployed:`)
    console.log(`   Transaction ID: ${txid}`)
    console.log(`   Output Index: ${vout}`)
    console.log(`   Address: ${address}`)
    console.log(`   Hashlock: ${secretHash.toString()}`)

    // Get current Ethereum epoch time and calculate timelock
    console.log('📊 Getting current Ethereum epoch time...');
    const ethereumRpcResponse = await axios.post('http://localhost:8545', {
        jsonrpc: '2.0',
        method: 'eth_getBlockByNumber',
        params: ['latest', false],
        id: 1
    });
    
    const currentEpoch = parseInt(ethereumRpcResponse.data.result.timestamp, 16);
    const ethereumTimelockEpoch = currentEpoch + ETHEREUM_TIMELOCK;
    
    console.log(`   Current epoch: ${currentEpoch}`);
    console.log(`   Timelock seconds: ${ETHEREUM_TIMELOCK}`);
    console.log(`   Calculated timelock epoch: ${ethereumTimelockEpoch}`);

    // Call resolver to create corresponding Ethereum swap
    console.log('🔄 Calling resolver to create Ethereum swap...')
    const swapRequest = {
        hashlock: secretHash,
        bitcoinTxid: txid,
        bitcoinVout: vout,
        bitcoinAmount: BITCOIN_AMOUNT,
        bitcoinLockTime: LOCK_TIME,
        bitcoinSenderPubKey: wallet.getPubKey().toString('hex'),
        ethereumAmount: ETHEREUM_AMOUNT,
        ethereumTimelock: ethereumTimelockEpoch,
        ethereumRecipient: USER_ETHEREUM_ADDRESS
    }

    console.log('📤 Sending swap request to resolver:', {
        bitcoinTxid: txid,
        bitcoinVout: vout,
        bitcoinAmount: BITCOIN_AMOUNT,
        ethereumAmount: ETHEREUM_AMOUNT,
        ethereumRecipient: USER_ETHEREUM_ADDRESS
    })

    res = await axios.post(RESOLVER_URL + "swap/bitcoin-ethereum", swapRequest)
    
    if (res.data.success) {
        console.log('✅ Ethereum swap created successfully!')
        console.log(`   Ethereum Transaction: ${res.data.ethereumTxHash}`)
        console.log(`   Ethereum Address: ${res.data.ethereumAddress}`)
        console.log(`   Hashlock: ${res.data.hashlock}`)
        console.log(`   Message: ${res.data.message}`)
        
        console.log('\n📋 Swap Summary:')
        console.log(`   Bitcoin HTLC: ${txid}:${vout}`)
        console.log(`   Ethereum HTLC: ${res.data.ethereumTxHash}`)
        console.log(`   Hashlock: ${res.data.hashlock}`)
        
        console.log('\n⏳ Waiting for user to complete the swap...')
        console.log('   To complete the swap, call the resolver with the secret:')
        console.log(`   POST ${RESOLVER_URL}complete/bitcoin-ethereum`)
        console.log(`   Body: { "bitcoinTxid": "${txid}", "bitcoinVout": ${vout}, ... }`)
        
    } else {
        console.error('❌ Failed to create Ethereum swap:', res.data.error)
    }

    await logBtcBalance(client, wallet.address, "Maker")
    await logEthBalance(provider, config.ethereum.address, "Maker")
    await logBtcBalance(client, resolverBitcoinAddress, "Resolver")
    await logEthBalance(provider, resolverEthAddress, "Resolver")


    console.log("Waiting for process")
    await sleep(3000)

    res = await axios.post(RESOLVER_URL + "complete/bitcoin-ethereum", {
        hashlock: secretHash,
        secret: secret,
        txid: txid,
        vout: vout,
        locktime: LOCK_TIME,
        amount: BITCOIN_AMOUNT,
        senderPubKey: wallet.getPubKey().toString('hex')
    })

    await sleep(3000)

    await logBtcBalance(client, wallet.address, "Maker")
    await logEthBalance(provider, config.ethereum.address, "Maker")
    await logBtcBalance(client, resolverBitcoinAddress, "Resolver")
    await logEthBalance(provider, resolverEthAddress, "Resolver")


    if (res.data.success) {
        console.log("Successfully completed")
    }
}

main().catch(console.error)

