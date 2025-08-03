import * as bitcoin from 'bitcoinjs-lib';

// Bitcoin Config

const config = {
    ethereum: {
        address: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
        rpcUrl: "http://127.0.0.1:8545"
    },
    bitcoin: {
        rpcUrl: "https://mempool.space/testnet4/api",
        address: "mm2v2g3j6hdbFqDccM7hvZe9PUjwFaAxvF",
        privateKey: "cTx8eHLFKqCtqUuhGwFAiGZbCdQSUxx3Lu27TKsCdTzhwTTczXv3",
        network: bitcoin.networks.testnet
    },
    resolverUrl: "http://localhost:3001/"
}

export default config