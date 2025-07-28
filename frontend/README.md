# Ethereum-to-Aptos Atomic Swap Frontend

A React frontend for initiating and managing cross-chain atomic swaps between Ethereum and Aptos blockchains.

## Current Status ✅

All issues have been resolved:
- ✅ Fixed Aptos SDK compatibility (updated to new @aptos-labs/ts-sdk)
- ✅ Fixed async hashlock generation
- ✅ Removed unsupported style jsx blocks
- ✅ Added proper CSS styling
- ✅ Fixed TypeScript compilation errors
- ✅ All services are running successfully

## Running Services

The following services should be running for the complete atomic swap system:

1. **Frontend** (http://localhost:3000) ✅ Running
2. **Hardhat Node** (http://localhost:8545) ✅ Running  
3. **Relayer Service** (http://localhost:3001) ✅ Running

## Features

- **Wallet Connection**: Connect MetaMask (Ethereum) and Petra (Aptos) wallets
- **Swap Initiation**: Create atomic swaps between Ethereum and Aptos
- **Swap Management**: View pending and completed swaps
- **Swap Actions**: Complete or refund swaps
- **Real-time Updates**: Automatic refresh of swap status

## Testing the Complete Flow

### Prerequisites

1. **MetaMask Extension**: Install and configure for localhost:8545
2. **Petra Wallet Extension**: Install and configure for Aptos testnet
3. **Test Accounts**: Ensure you have test accounts with some ETH and APT

### Step-by-Step Testing

1. **Access the Frontend**
   - Open http://localhost:3000 in your browser
   - You should see the atomic swap interface

2. **Connect Wallets**
   - Click "Connect MetaMask" and approve the connection
   - Click "Connect Petra" and approve the connection
   - Verify both wallet addresses are displayed

3. **Initiate a Swap**
   - Select "Ethereum" as the source chain
   - Enter a small amount (e.g., 0.001 ETH)
   - Enter your Aptos wallet address as the recipient
   - Set a reasonable timelock (e.g., 3600 seconds = 1 hour)
   - Click "Initiate Swap"
   - Approve the transaction in MetaMask

4. **Monitor the Swap**
   - The swap should appear in the "Pending Swaps" section
   - Note the hashlock value
   - The relayer should automatically detect the swap

5. **Complete the Swap**
   - Click "Complete Swap" on the pending swap
   - Approve the transaction in Petra wallet
   - The swap should move to "Completed Swaps"

6. **Test Refund (Optional)**
   - Wait for the timelock to expire
   - Click "Refund Swap" to test the refund functionality

## Technical Details

### Architecture
- **Frontend**: React with TypeScript
- **Ethereum**: Hardhat local network with MetaMask
- **Aptos**: Testnet with Petra wallet
- **Relayer**: Node.js service monitoring both chains

### Key Components
- `WalletConnector`: Manages wallet connections
- `SwapForm`: Initiates new swaps
- `SwapList`: Displays and manages existing swaps
- `StatusSection`: Shows system status

### Services
- `ethereumService`: Interacts with Ethereum contracts
- `aptosService`: Interacts with Aptos contracts
- `relayerService`: Communicates with the relayer API

## Troubleshooting

### Common Issues

1. **"MetaMask not found"**
   - Ensure MetaMask extension is installed and unlocked
   - Make sure you're on localhost:8545 network

2. **"Petra wallet not found"**
   - Ensure Petra extension is installed and unlocked
   - Make sure you're connected to Aptos testnet

3. **"Not connected" errors**
   - Reconnect your wallets
   - Check that the services are running

4. **Transaction failures**
   - Ensure you have sufficient balance
   - Check that the contract addresses are correct
   - Verify the relayer is running

### Service Status Check

```bash
# Check if services are running
curl http://localhost:3000  # Frontend
curl http://localhost:8545  # Hardhat
curl http://localhost:3001  # Relayer
```

## Environment Configuration

The frontend uses environment variables for configuration, similar to the relayer service. This allows for easy deployment across different networks and environments.

### Setting Up Environment Variables

1. **Copy the example file**:
   ```bash
   cp .env.example .env.local
   ```

2. **Configure your environment**:
   ```bash
   # Ethereum Configuration
   REACT_APP_ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
   REACT_APP_ETHEREUM_CHAIN_ID=11155111
   REACT_APP_ETHEREUM_CONTRACT_ADDRESS=0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0

   # Aptos Configuration
   REACT_APP_APTOS_NODE_URL=https://fullnode.testnet.aptoslabs.com
   REACT_APP_APTOS_CHAIN_ID=2
   REACT_APP_APTOS_CONTRACT_ADDRESS=0x5a901138b890f9aa4da23d2742c79974ea3cafef130589dc867adc09bd690b5a

   # Relayer Configuration
   REACT_APP_RELAYER_URL=http://localhost:3001

   # Network Configuration
   REACT_APP_NETWORK=testnet
   ```

### Environment Variables Reference

| Variable | Description | Default |
|----------|-------------|---------|
| `REACT_APP_ETHEREUM_RPC_URL` | Ethereum RPC endpoint | `https://sepolia.infura.io/v3/YOUR_PROJECT_ID` |
| `REACT_APP_ETHEREUM_CHAIN_ID` | Ethereum chain ID | `11155111` (Sepolia) |
| `REACT_APP_ETHEREUM_CONTRACT_ADDRESS` | Deployed Ethereum contract address | `0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0` |
| `REACT_APP_APTOS_NODE_URL` | Aptos node URL | `https://fullnode.testnet.aptoslabs.com` |
| `REACT_APP_APTOS_CHAIN_ID` | Aptos chain ID | `2` (Testnet) |
| `REACT_APP_APTOS_CONTRACT_ADDRESS` | Deployed Aptos contract address | `0x5a901138b890f9aa4da23d2742c79974ea3cafef130589dc867adc09bd690b5a` |
| `REACT_APP_RELAYER_URL` | Relayer service URL | `http://localhost:3001` |
| `REACT_APP_NETWORK` | Network environment | `testnet` |

### Configuration Management

The frontend uses a centralized configuration system in `src/config/index.ts` that:
- Loads all environment variables
- Provides type-safe access to configuration
- Includes fallback values for development
- Supports different environments (development, production, testnet, mainnet)

### Deployment Considerations

- **Development**: Use `.env.local` for local development
- **Production**: Set environment variables in your deployment platform
- **Security**: Never commit `.env.local` or production environment files
- **Validation**: The app will use fallback values if environment variables are missing

## Development

### Adding New Features
1. Create new components in `src/components/`
2. Add corresponding styles to `src/App.css`
3. Update types in `src/types.ts` if needed
4. Test thoroughly with both chains

### Contract Updates
- Update contract addresses in service files
- Ensure ABI matches deployed contracts
- Test with both local and testnet deployments

## Security Notes

⚠️ **Important**: This is a demonstration system. For production use:
- Implement proper secret management
- Add comprehensive error handling
- Use secure RPC endpoints
- Implement proper authentication
- Add rate limiting and validation
- Use proper cryptographic libraries

## Next Steps

1. **Enhanced UI**: Add better error messages and loading states
2. **Token Support**: Add ERC-20 token support
3. **Advanced Features**: Implement partial fills and order books
4. **Security**: Add comprehensive security measures
5. **Testing**: Add automated tests and integration tests
