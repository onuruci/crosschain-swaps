import * as bitcoin from 'bitcoinjs-lib';
import axios from 'axios';
import Wallet from '../wallet';
import BitcoinClient from '../client';
import { getHash } from '../utils';
import config from '../config';
import {ethers} from "ethers"
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
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

async function generateBlock() {
    try {
      await execAsync(`bitcoin-cli -regtest generatetoaddress 1 $(bitcoin-cli -regtest -rpcwallet="scriptwallet" getnewaddress)`);
    } catch (error) {
      console.error(`❌ Error: ${error}`);
    }
  }


const USER_ETHEREUM_ADDRESS = config.ethereum.address
const LOCK_TIME = 114
const BITCOIN_AMOUNT = 30000 // 0.01 BTC (1,000,000 satoshis) - minimal amount for testing
const ETHEREUM_AMOUNT = "0.0098" // 0.033333 ETH (equivalent to ~0.01 BTC: 0.01 * 33.33 = 0.033333 ETH)
const ETHEREUM_TIMELOCK = 110600 // 1 hour in seconds

function formatBytes(bytes: Uint8Array) {
    return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function logBtcBalance(client:any, address: string, name: string) {
    let walletBalance = await client.getBalance(address)
    console.log(`💰 ${name} BTC Balance: ${walletBalance} sats (${(walletBalance / 100000000).toFixed(8)} BTC)`)
}

async function logEthBalance(provider: any, address: string, name: string) {
    let weiBalance = await provider.getBalance(address) 
    console.log(`💎 ${name} ETH Balance: ${parseFloat(ethers.formatEther(weiBalance.toString())).toFixed(6)} ETH`)
}

function printSeparator(title: string) {
    console.log('\n' + '='.repeat(60))
    console.log(`🎯 ${title}`)
    console.log('='.repeat(60))
}

function printSubSection(title: string) {
    console.log('\n' + '-'.repeat(40))
    console.log(`📋 ${title}`)
    console.log('-'.repeat(40))
}

async function main() {
    const client = new BitcoinClient(NETWORK)
    const wallet = new Wallet(NETWORK, client)
    const provider = new ethers.JsonRpcProvider(ETHEREUM_RPC_URL);
    await generateBlock()

    printSeparator('🚀 BITCOIN TO ETHEREUM ATOMIC SWAP INITIATION')
    console.log(`📍 User Bitcoin Address: ${wallet.getAddress()}`)
    console.log(`🔗 Network: ${NETWORK}`)
    console.log(`⚡ Swap Amount: ${BITCOIN_AMOUNT} sats (${(BITCOIN_AMOUNT / 100000000).toFixed(8)} BTC) → ${ETHEREUM_AMOUNT} ETH`)

    // Get resolver's public key
    printSubSection('🔑 FETCHING RESOLVER PUBLIC KEY')
    console.log('📡 Requesting resolver public key...')
    let res = await axios.get(RESOLVER_URL + "bitcoin-pubkey")
    const resolverPubKey = Buffer.from(res.data.pubkey, 'hex')

    const resolverBitcoinAddress = res.data.address
    const resolverEthAddress = res.data.eth_address

    console.log(`✅ Resolver Bitcoin Address: ${resolverBitcoinAddress}`)
    console.log(`✅ Resolver Ethereum Address: ${resolverEthAddress}`)

    printSubSection('💰 INITIAL BALANCES')
    await logBtcBalance(client, wallet.address, "Maker")
    await logEthBalance(provider, config.ethereum.address, "Maker")
    await logBtcBalance(client, resolverBitcoinAddress, "Resolver")
    await logEthBalance(provider, resolverEthAddress, "Resolver")

    // Deploy Bitcoin HTLC
    printSubSection('🔒 DEPLOYING BITCOIN HTLC')
    console.log('🎲 Generating cryptographically secure secret and hashlock...')
    const { secret, secretHash } = await generateSecretAndHashlock();

    console.log(`🔐 Generated Secret: ${secret}`)
    console.log(`🔒 Generated Hashlock: ${secretHash}`)
    
    // Verification step
    console.log('🔍 Verifying hash calculation...')
    const calculatedHash = await calculateHashFromSecret(secret);
    console.log(`✅ Hash verification: ${calculatedHash === secretHash ? 'PASSED' : 'FAILED'}`)
    
    const hex = secret.slice(2);
    let bytes = new Uint8Array(hex.match(/.{2}/g)?.map(byte => parseInt(byte, 16)) || []);
    const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
    const hashBytes = new Uint8Array(hashBuffer);
    console.log(`🔢 Raw hash bytes: ${formatBytes(hashBytes)}`)
    
    console.log('📝 Creating Bitcoin HTLC transaction...')
    const { txid, vout, address, lockerPubKey, hash } = await wallet.deployHashlockScript(
        resolverPubKey, 
        secretHash, 
        LOCK_TIME, 
        BITCOIN_AMOUNT
    )
    generateBlock()
    
    console.log(`✅ Bitcoin HTLC Successfully Deployed!`)
    console.log(`   🆔 Transaction ID: ${txid}`)
    console.log(`   📍 Output Index: ${vout}`)
    console.log(`   🏠 HTLC Address: ${address}`)
    console.log(`   🔒 Hashlock: ${secretHash.toString()}`)
    console.log(`   ⏰ Lock Time: ${LOCK_TIME} blocks`)

    // Get current Ethereum epoch time and calculate timelock
    printSubSection('⏰ CALCULATING ETHEREUM TIMELOCK')
    console.log('📊 Fetching current Ethereum block timestamp...');
    const ethereumRpcResponse = await axios.post('http://localhost:8545', {
        jsonrpc: '2.0',
        method: 'eth_getBlockByNumber',
        params: ['latest', false],
        id: 1
    });

    generateBlock()
    
    const currentEpoch = parseInt(ethereumRpcResponse.data.result.timestamp, 16);
    const ethereumTimelockEpoch = currentEpoch + ETHEREUM_TIMELOCK;
    
    console.log(`   🕐 Current Epoch: ${currentEpoch}`)
    console.log(`   ⏱️  Timelock Duration: ${ETHEREUM_TIMELOCK} seconds (${(ETHEREUM_TIMELOCK/3600).toFixed(2)} hours)`)
    console.log(`   🎯 Target Epoch: ${ethereumTimelockEpoch}`)

    // Call resolver to create corresponding Ethereum swap
    printSubSection('🔄 CREATING ETHEREUM COUNTERPART')
    console.log('📡 Initiating Ethereum HTLC creation via resolver...')
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

    console.log('📤 Swap Request Details:')
    console.log(`   🪙 Bitcoin Amount: ${BITCOIN_AMOUNT} sats`)
    console.log(`   💎 Ethereum Amount: ${ETHEREUM_AMOUNT} ETH`)
    console.log(`   📍 Recipient: ${USER_ETHEREUM_ADDRESS}`)
    console.log(`   🔗 Bitcoin TX: ${txid}:${vout}`)

    res = await axios.post(RESOLVER_URL + "swap/bitcoin-ethereum", swapRequest)
    generateBlock()
    
    if (res.data.success) {
        printSubSection('✅ SWAP CREATION SUCCESSFUL')
        console.log('🎉 Both HTLCs have been successfully created!')
        console.log(`   🔗 Ethereum Transaction: ${res.data.ethereumTxHash}`)
        console.log(`   🏠 Ethereum HTLC Address: ${res.data.ethereumAddress}`)
        console.log(`   🔒 Shared Hashlock: ${res.data.hashlock}`)
        console.log(`   💬 Status: ${res.data.message}`)
        
        printSubSection('📊 SWAP SUMMARY')
        console.log('🔄 Cross-Chain Atomic Swap Details:')
        console.log(`   🪙 Bitcoin HTLC: ${txid}:${vout}`)
        console.log(`   💎 Ethereum HTLC: ${res.data.ethereumTxHash}`)
        console.log(`   🔒 Shared Hashlock: ${res.data.hashlock}`)
        console.log(`   ⏰ Bitcoin Lock: ${LOCK_TIME} blocks`)
        console.log(`   ⏰ Ethereum Lock: ${ethereumTimelockEpoch} epoch`)
        
        console.log('\n⏳ Waiting for swap completion...')
        console.log('   To complete the swap, the resolver will use the secret to claim both assets')
        
    } else {
        console.error('❌ Failed to create Ethereum swap:', res.data.error)
    }

    await sleep(1000)


    printSubSection('💰 BALANCES AFTER HTLC CREATION')
    await logBtcBalance(client, wallet.address, "Maker")
    await logEthBalance(provider, config.ethereum.address, "Maker")
    await logBtcBalance(client, resolverBitcoinAddress, "Resolver")
    await logEthBalance(provider, resolverEthAddress, "Resolver")

    printSubSection('🔓 COMPLETING THE SWAP')
    console.log("⏳ Waiting 3 seconds before completing swap...")
    await sleep(1000)

    console.log('🔑 Submitting secret to complete the swap...')
    res = await axios.post(RESOLVER_URL + "complete/bitcoin-ethereum", {
        hashlock: secretHash,
        secret: secret,
        txid: txid,
        vout: vout,
        locktime: LOCK_TIME,
        amount: BITCOIN_AMOUNT,
        senderPubKey: wallet.getPubKey().toString('hex')
    })
    generateBlock()

    console.log('⏳ Waiting 3 seconds for transaction confirmation...')
    await sleep(1000)

    printSubSection('💰 FINAL BALANCES')
    await logBtcBalance(client, wallet.address, "Maker")
    await logEthBalance(provider, config.ethereum.address, "Maker")
    await logBtcBalance(client, resolverBitcoinAddress, "Resolver")
    await logEthBalance(provider, resolverEthAddress, "Resolver")

    if (res.data.success) {
        printSeparator('🎉 SWAP COMPLETED SUCCESSFULLY!')
        console.log('✅ Cross-chain atomic swap has been completed!')
        console.log('🔄 Assets have been exchanged between Bitcoin and Ethereum')
        console.log('🔒 Both HTLCs have been redeemed using the shared secret')
    } else {
        console.error('❌ Swap completion failed:', res.data.error)
    }
}

main().catch(console.error)