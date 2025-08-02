const crypto = require('crypto');

// Read the public key from the file
const fs = require('fs');
const publicKeyHex = fs.readFileSync('new_account.key.pub', 'utf8').trim();

console.log('Public Key:', publicKeyHex);

// Convert hex to bytes
const publicKeyBytes = Buffer.from(publicKeyHex, 'hex');

// Create the account address by hashing the public key
const accountAddressBytes = crypto.createHash('sha3-256').update(publicKeyBytes).digest();

// Convert to hex and format as Aptos address
const accountAddress = '0x' + accountAddressBytes.toString('hex');

console.log('Account Address:', accountAddress);
console.log('\n📋 Use this address in your Move.toml and deployment commands'); 