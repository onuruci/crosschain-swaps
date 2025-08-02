import * as bitcoin from 'bitcoinjs-lib';

function createHashlockScript(hash: any, lockTime: any, receipentPubKey: any, senderPubKey: any) {
    const hashBuffer = hash.startsWith('0x') ? 
        Buffer.from(hash.slice(2), 'hex') : 
        Buffer.from(hash, 'hex');
    return bitcoin.script.compile([
        bitcoin.opcodes.OP_IF,
            bitcoin.opcodes.OP_SHA256,
            hashBuffer,
            bitcoin.opcodes.OP_EQUALVERIFY,
            receipentPubKey,
            bitcoin.opcodes.OP_CHECKSIG,
        bitcoin.opcodes.OP_ELSE,
            bitcoin.script.number.encode(lockTime),
            bitcoin.opcodes.OP_CHECKLOCKTIMEVERIFY,
            bitcoin.opcodes.OP_DROP,
            senderPubKey,
            bitcoin.opcodes.OP_CHECKSIG,
        bitcoin.opcodes.OP_ENDIF,
    ]);
}

function createHashlockScriptP2Address(hash: any, lockTime: any, publicKeyHash: any) {
    return bitcoin.script.compile([
        bitcoin.opcodes.OP_IF,
            bitcoin.opcodes.OP_SHA256,
            hash,
            bitcoin.opcodes.OP_EQUALVERIFY,
        bitcoin.opcodes.OP_ELSE,
            bitcoin.script.number.encode(lockTime),
            bitcoin.opcodes.OP_CSV,
            bitcoin.opcodes.OP_DROP,
        bitcoin.opcodes.OP_ENDIF,
        bitcoin.opcodes.OP_DUP,
        bitcoin.opcodes.OP_HASH160,
        Buffer.from(publicKeyHash, 'hex'),
        bitcoin.opcodes.OP_EQUALVERIFY,
        bitcoin.opcodes.OP_CHECKSIG
    ]);
}

export {
    createHashlockScript,
    createHashlockScriptP2Address
}
