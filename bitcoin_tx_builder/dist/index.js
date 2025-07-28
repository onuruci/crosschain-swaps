"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bitcoin = __importStar(require("bitcoinjs-lib"));
const wallet_1 = __importDefault(require("./wallet"));
const client_1 = __importDefault(require("./client"));
const NETWORK = bitcoin.networks.regtest;
const client = new client_1.default(NETWORK);
const wallet = new wallet_1.default("wallet", NETWORK, client);
const wallet1 = new wallet_1.default("wallet1", NETWORK, client);
const secret = "hello";
const lockTime = 114;
const amount = 100000;
//client.getBlockCount()
let address = wallet.getAddress();
console.log(address);
// wallet.generateTransaction(wallet1.getAddress(), 1000)
const wallet1_pkh = wallet_1.default.getPublicKeyHash(NETWORK, wallet1.getAddress());
//wallet.deployHashlockScript(wallet1_pkh, secret, lockTime, amount)
//client.getBalance('bcrt1qpwte9teulj839pm4hrt075fvsk956wr73s6duv7j8rawzsj9fqksxc95df')
wallet1.spendHashlockWithSecret('00d0ece078b51b5534d9376b9ad3e6a4664ef5bb725bce30e727b48dbbcd4f44', 0, wallet1.getAddress(), secret, lockTime, amount, wallet1_pkh);
//client.getBalance(wallet1.getAddress())
/*
    These are set of functions for Bitcoin Fusion+ POC implementation
*/ 
