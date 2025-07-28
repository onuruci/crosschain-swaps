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

    public async newHashlockedContractDst(address: string, secretHash: string, lockTime: number, amount: number) {
        let wallet_pkh = Wallet.getPublicKeyHash(NETWORK, address)
        await this.wallet.deployHashlockScript(wallet_pkh, secretHash, lockTime, amount)
    }

    public async completeSwap(
        txid: string, 
        vout: number, 
        secret:string, 
        locktime:number, 
        amount:number, 
        ) {
        const wallet_pkh = Wallet.getPublicKeyHash(NETWORK, this.wallet.getAddress())
        await this.wallet.spendHashlockWithSecret(txid, vout, this.wallet.getAddress(), secret, locktime, amount, wallet_pkh)
    }
}

const bitcoinService = new BitcoinService()
export default bitcoinService