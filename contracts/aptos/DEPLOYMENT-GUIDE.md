# Quick Deployment Guide - Simplified Atomic Swap Contract

## 🚀 Quick Start

### Option 1: Using the Setup Script (Recommended)

```bash
# Navigate to the aptos contracts directory
cd contracts/aptos

# Set your private key and run the setup script
APTOS_PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef ./setup-and-deploy.sh
```

### Option 2: Manual Deployment

```bash
# Navigate to the aptos contracts directory
cd contracts/aptos

# Set your private key
export APTOS_PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef

# Deploy the contract
node deploy-simplified.js
```

## 🔑 Getting a Private Key

1. Go to [Aptos Testnet Faucet](https://aptoslabs.com/testnet-faucet)
2. Create a new account
3. Copy the private key (64 hex characters)
4. Get some testnet APT tokens (at least 0.01 APT)

## 📋 After Deployment

1. **Copy the contract address** from the deployment output
2. **Update your backend config**:

```javascript
// backend/relayer/config/config.js
module.exports = {
  aptos: {
    nodeUrl: 'https://fullnode.testnet.aptoslabs.com',
    contractAddress: '0xYOUR_DEPLOYED_ADDRESS::AtomicSwap', // Replace with your address
    privateKey: process.env.APTOS_PRIVATE_KEY
  }
  // ... rest of config
};
```

3. **Test the contract**:
```bash
cd contracts/aptos
CONTRACT_ADDRESS=0xYOUR_DEPLOYED_ADDRESS::AtomicSwap node test-simplified.js
```

4. **Start the relayer**:
```bash
cd backend/relayer
npm start
```

## 🔧 Troubleshooting

### "Cannot read properties of undefined (reading 'replace')"
- **Solution**: Set the `APTOS_PRIVATE_KEY` environment variable
- **Example**: `export APTOS_PRIVATE_KEY=0x1234567890abcdef...`

### "Invalid private key length"
- **Solution**: Make sure your private key is exactly 64 hex characters
- **Example**: `0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef`

### "INSUFFICIENT_BALANCE"
- **Solution**: Get more testnet APT from the faucet
- **Link**: https://aptoslabs.com/testnet-faucet

### "Move module not found"
- **Solution**: Make sure you're in the `contracts/aptos` directory
- **Check**: `ls sources/AtomicSwap.move`

## 📄 Files Created

After successful deployment, you'll get:
- `deployment-info.json` - Contract deployment details
- Updated backend configuration
- Test results from `test-simplified.js`

## 🎯 What's Different

The simplified contract:
- ✅ Uses global storage (like Solidity)
- ✅ Direct function calls (no complex lookups)
- ✅ Same API as Solidity contract
- ✅ Easier to understand and maintain
- ✅ Better performance
- ✅ Simpler backend integration 