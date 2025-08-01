import * as bitcoin from 'bitcoinjs-lib';
import axios from 'axios';
import Wallet from '../wallet';
import BitcoinClient from '../client';
import { getHash } from '../utils';
import config from '../config';

const NETWORK = config.bitcoin.network

const RESOLVER_URL = config.resolverUrl

const USER_ETHEREUM_ADDRESS = config.ethereum.address
const SECRET = "helloasdasdasdasdasdasasfasd" // TODO: Generate random secret in production
const LOCK_TIME = 114
const BITCOIN_AMOUNT = 100000 // satoshis
const ETHEREUM_AMOUNT = "1.0" // 1 ETH in wei
const ETHEREUM_TIMELOCK = 110600 // 1 hour in seconds

async function main() {
    const client = new BitcoinClient(NETWORK)
    const wallet = new Wallet(NETWORK, client)
    console.log('🚀 Starting Bitcoin to Ethereum swap...')    
    console.log(`📱 User Bitcoin address: ${wallet.getAddress()}`)

    // Get resolver's public key
    console.log('🔑 Getting resolver public key...')
    let res = await axios.get(RESOLVER_URL + "bitcoin-pubkey")
    const resolverPubKey = Buffer.from(res.data.pubkey, 'hex')
    console.log(`✅ Resolver public key: ${res.data.pubkey}`)

    // Deploy Bitcoin HTLC
    console.log('🔒 Deploying Bitcoin HTLC...')
    const secretHash = getHash(SECRET)
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
    console.log(`   Hashlock: ${secretHash.toString('hex')}`)

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
        hashlock: secretHash.toString('hex'),
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
        console.log(`   Secret: ${SECRET}`)
        
        console.log('\n⏳ Waiting for user to complete the swap...')
        console.log('   To complete the swap, call the resolver with the secret:')
        console.log(`   POST ${RESOLVER_URL}complete/bitcoin-ethereum`)
        console.log(`   Body: { "bitcoinTxid": "${txid}", "bitcoinVout": ${vout}, ... }`)
        
    } else {
        console.error('❌ Failed to create Ethereum swap:', res.data.error)
    }
}

main().catch(console.error)

