import * as bitcoin from 'bitcoinjs-lib';

// Bitcoin Config

const config = {
    ethereum: {
        address: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
        rpcUrl: "http://127.0.0.1:8545"
    },
    bitcoin: {
        rpcUrl: 'http://bitcoin:secretpassword@localhost:18443',
        address: "n1Sx3V9R7PnFgNAZ9GdwuWe6Nni6Z4ue5s",
        privateKey: "cVxQKBCYKDNfev1Q7uS994tb2SecqaV5xJXWcHXtosn8WXAsHDAr",
        network: bitcoin.networks.regtest
    },
    resolverUrl: "http://localhost:3001/"
}

export default config