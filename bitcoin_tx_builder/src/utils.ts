import crypto from 'crypto';

function getHash(secret: any) {
    return crypto.createHash('sha256').update(secret).digest();
}

export {
    getHash
}