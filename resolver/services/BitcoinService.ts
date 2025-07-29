import Wallet from "../src/wallet"
import Client from "../src/client"
import * as bitcoin from 'bitcoinjs-lib';


const NETWORK = bitcoin.networks.regtest

class BitcoinService {
    private wallet: Wallet 
    private client: Client

    constructor() {
        this.client = new Client(NETWORK)

        this.wallet = new Wallet("resolverWallet", NETWORK, this.client)
    }

    public walletAddress() {
        return this.wallet.getAddress()
    }

    public async newHashlockedContractDst(recepientPukKey: string, secretHash: string, lockTime: number, amount: number) {
        const bufferedPubKey = Buffer.from(recepientPukKey, 'hex')

        await this.wallet.deployHashlockScript(bufferedPubKey, Buffer.from(secretHash, 'hex'), lockTime, amount)
    }

    public async completeSwap(
        txid: string, 
        vout: number, 
        secret:string, 
        lockTime:number, 
        amount:number,
        senderPubKey: string
        ) {

            console.log(txid)
            console.log(vout)
            console.log(secret)
            console.log(lockTime)
            console.log(amount)
            console.log(senderPubKey)
        const bufferedSenderPubKey = Buffer.from(senderPubKey, 'hex')

        console.log(bufferedSenderPubKey)
        await this.wallet.spendHashlockWithSecret(txid, vout, this.wallet.getAddress(), secret, lockTime, amount, bufferedSenderPubKey)
    }
}

const bitcoinService = new BitcoinService()
export default bitcoinService