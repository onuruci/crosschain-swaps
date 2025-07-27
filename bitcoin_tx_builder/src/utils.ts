import crypto from 'crypto';

function getHash(secret: string) {
    return crypto.createHash('sha256').update(secret).digest();
}

export {
    getHash
}