import * as bitcoin from 'bitcoinjs-lib';
import axios from 'axios';
import Wallet from './wallet';
import BitcoinClient from './client';

const NETWORK = bitcoin.networks.regtest


const client = new BitcoinClient(NETWORK)
const wallet = new Wallet("wallet", NETWORK, client)
const wallet1 = new Wallet("wallet1", NETWORK, client)


const secret = "hello"
const lockTime = 114
const amount = 100000

//client.getBlockCount()
let address = wallet.getAddress()
console.log(address)

// wallet.generateTransaction(wallet1.getAddress(), 1000)

const wallet1_pkh = Wallet.getPublicKeyHash(NETWORK, wallet1.getAddress())

const wallet_pubKey = (Buffer.from(wallet.getPubKey())).toString('hex')

//wallet.deployHashlockScript(wallet1.getPubKey(), secret, lockTime, amount)


//client.getBalance('bcrt1qvettdnwkn9rlfxl7pxwltame707sf4qprrd7gu0dyfsjr77s0n7sxgjgdf')
//wallet1.spendHashlockWithSecret('c1133b0337711ecd7c1d35ba4a9008e0b7c6a057e41347df227dc4b9011988bd', 0, wallet1.getAddress(), secret, lockTime, amount, wallet.getPubKey())

client.getBalance(wallet1.getAddress())

/*
    These are set of functions for Bitcoin Fusion+ POC implementation
*/