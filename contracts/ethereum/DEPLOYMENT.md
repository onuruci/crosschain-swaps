# Hardhat Deployment Guide

This guide explains how to deploy the AtomicSwap and MockERC20 contracts using Hardhat.

## Prerequisites

- Node.js and npm installed
- OpenZeppelin contracts installed: `npm install @openzeppelin/contracts`
- Hardhat toolbox installed: `npm install --save-dev @nomicfoundation/hardhat-toolbox`

## Quick Start

### 1. Compile Contracts
```bash
npm run compile
# or
npx hardhat compile
```

### 2. Deploy to Local Network
```bash
# Start local Hardhat node (in a separate terminal)
npm run node
# or
npx hardhat node

# Deploy contracts
npm run deploy:local
# or
npx hardhat run scripts/deploy.js --network localhost
```

### 3. Deploy to Hardhat Network (for testing)
```bash
npm run deploy
# or
npx hardhat run scripts/deploy.js
```

## Available Scripts

- `npm run compile` - Compile all contracts
- `npm run deploy` - Deploy to Hardhat network
- `npm run deploy:local` - Deploy to localhost network
- `npm run verify` - Verify deployed contracts (update addresses first)
- `npm run node` - Start local Hardhat node
- `npm run clean` - Clean build artifacts

## Network Configuration

To deploy to other networks (testnets, mainnet), add network configuration to `hardhat.config.js`:

```javascript
networks: {
  sepolia: {
    url: `https://sepolia.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
    accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
  }
}
```

Then deploy with:
```bash
npx hardhat run scripts/deploy.js --network sepolia
```

## Environment Variables

Create a `.env` file for sensitive data:
```
PRIVATE_KEY=your_private_key_here
INFURA_PROJECT_ID=your_infura_project_id
```

## Contract Addresses

After deployment, the script will output:
- MockERC20 Token address
- AtomicSwap Contract address
- Deployer address and token balance

## Verification

Use the verification script to check deployed contracts:
1. Update contract addresses in `scripts/verify-deployment.js`
2. Run: `npm run verify`

## Troubleshooting

- **Import errors**: Ensure OpenZeppelin contracts are installed
- **Compilation errors**: Check Solidity version compatibility
- **Deployment failures**: Verify network configuration and account balance 