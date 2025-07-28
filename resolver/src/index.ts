import * as bitcoin from 'bitcoinjs-lib';
import axios from 'axios';
import Wallet from './wallet';
import BitcoinClient from './client';
import { getHash } from './utils';

const NETWORK = bitcoin.networks.regtest


const client = new BitcoinClient(NETWORK)
const wallet = new Wallet("wallet", NETWORK, client)
const wallet1 = new Wallet("wallet1", NETWORK, client)


const secret = "hello"
const secretHash = getHash(secret)
const lockTime = 114
const amount = 100000

//client.getBlockCount()
let address = wallet.getAddress()
console.log(address)

// wallet.generateTransaction(wallet1.getAddress(), 1000)

const wallet1_pkh = Wallet.getPublicKeyHash(NETWORK, wallet1.getAddress())


//wallet.deployHashlockScript(wallet1_pkh, secretHash, lockTime, amount)


//client.getBalance('bcrt1qpwte9teulj839pm4hrt075fvsk956wr73s6duv7j8rawzsj9fqksxc95df')
wallet1.spendHashlockWithSecret('00d0ece078b51b5534d9376b9ad3e6a4664ef5bb725bce30e727b48dbbcd4f44', 0, wallet1.getAddress(), secret, lockTime, amount, wallet1_pkh)

//client.getBalance(wallet1.getAddress())

/*
    These are set of functions for Bitcoin Fusion+ POC implementation
*/