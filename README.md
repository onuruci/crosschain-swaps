# Cross-Chain Atomic Swap Bridge

A cryptographically secure, intent-based cross-chain atomic swap implementation between **Ethereum**, **Aptos**, and **Bitcoin** using Hash Time Locked Contracts (HTLCs) and meta-transactions.

## 🎯 Overview

This project implements a Fusion+-inspired cross-chain atomic swap protocol that enables trustless asset exchange between different blockchain networks while preserving timelock and hashlock functionalities in non-EVM environments.

### Key Features

- **🔒 Cryptographically Secure**: Funds remain locked until the secret is released
- **⏰ Fault-Proof**: Timelock functionality ensures funds can be refunded after expiration
- **🎯 Intent-Based**: Users sign swap intents through the UI, executed by resolvers
- **🔄 Meta-Transaction Support**: Gasless transactions for seamless user experience
- **🌐 Multi-Chain Support**: Ethereum, Aptos, and Bitcoin integration
- **📱 Modern UI**: React-based frontend with real-time swap tracking

## 🏗️ Architecture

### Core Components

```
crosschain-swaps/
├── contracts/           # Smart contracts for each chain
│   ├── ethereum/       # Solidity contracts with HTLC implementation
│   ├── aptos/          # Move contracts with fungible assets
│   └── bitcoin/        # Node.js scripts for Bitcoin HTLCs
├── frontend/           # React application with Material-UI
├── resolver/           # Node.js resolver service
└── README.md
```

### Protocol Flow

1. **Intent Creation**: User signs swap intent through UI
2. **Resolver Acceptance**: Resolver validates and accepts the swap
3. **Source Escrow**: Resolver creates escrow on source chain
4. **Destination Escrow**: Resolver creates counter-escrow on destination chain
5. **Secret Release**: User shares secret with resolver
6. **Swap Completion**: Resolver completes both escrows using the secret

## 🔧 Technology Stack

### Smart Contracts
- **Ethereum**: Solidity with OpenZeppelin contracts, Hardhat for deployment
- **Aptos**: Move language with fungible assets and meta-transactions
- **Bitcoin**: BitcoinJS-lib for HTLC script generation and transaction management

### Frontend
- **React 18** with TypeScript
- **Material-UI** for modern, responsive design
- **Redux Toolkit** for state management
- **Ethers.js** for Ethereum interactions
- **Aptos SDK** for Aptos blockchain integration

### Backend
- **Node.js** with Express.js
- **TypeScript** for type safety
- **BitcoinJS-lib** for Bitcoin transaction handling
- **Ethers.js** for Ethereum contract interactions

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Git
- Local blockchain networks (optional for development)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd crosschain-swaps
   ```

2. **Install dependencies for all components**
   ```bash
   # Install frontend dependencies
   cd frontend
   npm install
   
   # Install resolver dependencies
   cd ../resolver
   npm install
   
   # Install Ethereum contract dependencies
   cd ../contracts/ethereum
   npm install
   
   # Install Bitcoin script dependencies
   cd ../bitcoin
   npm install
   ```

3. **Environment Configuration**
   
   Create `.env` files in the respective directories:

   **Frontend (.env)**
   ```env
   REACT_APP_RESOLVER_URL=http://localhost:3001
   REACT_APP_ETHEREUM_RPC_URL=http://localhost:8545
   REACT_APP_APTOS_RPC_URL=https://fullnode.testnet.aptoslabs.com
   ```

   **Resolver (.env)**
   ```env
   ETHEREUM_PRIVATE_KEY=your_ethereum_private_key
   APTOS_PRIVATE_KEY=your_aptos_private_key
   BITCOIN_PRIVATE_KEY=your_bitcoin_private_key
   RESOLVER_PORT=3001
   ```

### Deployment

#### 1. Deploy Ethereum Contracts

```bash
cd contracts/ethereum

# Compile contracts
npx hardhat compile

# Deploy to local network
npx hardhat run scripts/deploy.js --network localhost

# Deploy to testnet
npx hardhat run scripts/deploy.js --network testnet
```

#### 2. Deploy Aptos Contracts

```bash
cd contracts/aptos

# Build Move modules
aptos move build

# Deploy to testnet
aptos move publish --named-addresses AtomicSwapTuna=your_address
```

#### 3. Start the Resolver Service

```bash
cd resolver

# Build TypeScript
npm run build

# Start the service
npm start
```

#### 4. Start the Frontend

```bash
cd frontend

# Start development server
npm start
```

## 📖 Usage Guide

### For Users

1. **Connect Wallets**
   - Connect MetaMask for Ethereum
   - Connect Petra for Aptos
   - Ensure sufficient balances on both chains

2. **Initiate Swap**
   - Select source and destination chains
   - Enter input and output amounts
   - Provide recipient address on destination chain
   - Set timelock duration (minimum 5 minutes)

3. **Complete Swap**
   - Wait for both escrows to be created
   - Use the "Complete Swap" button to release the secret
   - Monitor transaction status

### For Developers

#### Ethereum Integration

```typescript
import { ethereumService } from './services/ethereum';

// Generate secret and hashlock
const secret = ethereumService.generateSecret();
const hashlock = ethereumService.generateHashlock(secret);

// Initiate swap with meta-transaction
const result = await ethereumService.initiateSwapSignature(
  resolverAddress,
  hashlock,
  timelock,
  amount
);
```

#### Aptos Integration

```typescript
import { aptosService } from './services/aptos';

// Initiate swap with fungible assets
const result = await aptosService.initiateSwapSignature(
  resolverAddress,
  hashlock,
  timelock,
  amount
);
```

#### Bitcoin Integration

```typescript
import { createHashlockScript } from './bitcoinScripts';

// Create HTLC script
const script = createHashlockScript(
  hashlock,
  lockTime,
  recipientPubKey,
  senderPubKey
);
```

## 🔐 Security Features

### Cryptographic Security
- **Hashlock**: SHA-256 hash of secret ensures funds remain locked
- **Timelock**: Prevents indefinite locking with configurable expiration
- **Nonce Protection**: Prevents replay attacks on meta-transactions
- **Signature Verification**: EIP-712 compliant signature verification

### Smart Contract Security
- **Reentrancy Protection**: OpenZeppelin ReentrancyGuard
- **Access Control**: Owner-only emergency functions
- **Input Validation**: Comprehensive parameter validation
- **Custom Errors**: Gas-efficient error handling

### Bitcoin Security
- **HTLC Scripts**: Cryptographically secure Bitcoin scripts
- **UTXO Management**: Proper UTXO handling and validation
- **Timelock Verification**: CLTV (Check Lock Time Verify) implementation

## 🧪 Testing

### Contract Testing

```bash
# Ethereum contracts
cd contracts/ethereum
npx hardhat test

# Aptos contracts
cd contracts/aptos
aptos move test
```

### Integration Testing

```bash
# Test Bitcoin-Ethereum swap
cd contracts/bitcoin/src/scripts
npm run test:ethereum-bitcoin

# Test Ethereum-Aptos swap
cd frontend
npm run test:integration
```

## 📊 Monitoring & Analytics

### Event Tracking
- **Swap Initiated**: Tracks new swap creation
- **Swap Completed**: Records successful swap completion
- **Swap Refunded**: Monitors refunded swaps
- **Meta Transaction**: Logs gasless transaction usage

### Health Checks
- **Resolver Status**: Real-time resolver availability
- **Chain Connectivity**: Network connection monitoring
- **Balance Tracking**: Asset balance monitoring

## 🔧 Configuration

### Network Configuration

```typescript
// Ethereum Configuration
const ethereumConfig = {
  rpcUrl: 'http://localhost:8545',
  chainId: 1337,
  contractAddress: '0x...',
  resolverAddress: '0x...'
};

// Aptos Configuration
const aptosConfig = {
  rpcUrl: 'https://fullnode.testnet.aptoslabs.com',
  moduleAddress: '0x...',
  resolverAddress: '0x...'
};

// Bitcoin Configuration
const bitcoinConfig = {
  network: 'testnet',
  rpcUrl: 'http://localhost:8332',
  resolverAddress: 'bc1...'
};
```

### Timelock Configuration
- **Minimum**: 300 seconds (5 minutes)
- **Maximum**: 86400 seconds (24 hours)
- **Default**: 3600 seconds (1 hour)

## 🚨 Troubleshooting

### Common Issues

1. **Transaction Failed**
   - Check gas fees and network congestion
   - Verify wallet has sufficient balance
   - Ensure timelock hasn't expired

2. **Resolver Unavailable**
   - Check resolver service status
   - Verify network connectivity
   - Check environment variables

3. **Secret Not Found**
   - Clear browser storage and retry
   - Check if secret was properly stored
   - Verify hashlock matches

### Debug Mode

Enable debug logging by setting environment variables:

```env
DEBUG=true
LOG_LEVEL=debug
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Write comprehensive tests
- Update documentation for new features
- Use conventional commit messages

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Fusion+ Protocol**: Inspiration for intent-based swaps
- **OpenZeppelin**: Security-focused smart contract libraries
- **BitcoinJS-lib**: Bitcoin transaction handling
- **Aptos Labs**: Move language and blockchain infrastructure

## 📞 Support

For support and questions:

- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Documentation**: [Project Wiki](https://github.com/your-repo/wiki)
- **Discord**: [Community Server](https://discord.gg/your-server)

---

**⚠️ Disclaimer**: This is experimental software. Use at your own risk and only with small amounts for testing purposes. 