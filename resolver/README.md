# Resolver Service

A Node.js service that handles cross-chain atomic swap operations by creating counter swaps on different blockchains.

## Features

- **Ethereum Counter Swaps**: Create counter swaps on Ethereum blockchain
- **Aptos Counter Swaps**: Create counter swaps on Aptos blockchain
- **Bitcoin Integration**: Complete Bitcoin swaps with secret revelation
- **Multi-chain Support**: Support for Ethereum, Aptos, and Bitcoin networks

## API Endpoints

### Health Check
```
GET /
```
Returns service health status.

### Create Ethereum Counter Swap
```
POST /swap/ethereum
```
Creates a counter swap on the Ethereum blockchain.

**Request Body:**
```json
{
  "hashlock": "0x1234567890abcdef...",
  "makerAddress": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
  "timelock": 1703123456,
  "amount": "0.001"
}
```

**Response:**
```json
{
  "success": true,
  "txHash": "0xabc123...",
  "address": "0xresolverAddress..."
}
```

### Create Aptos Counter Swap
```
POST /swap/aptos
```
Creates a counter swap on the Aptos blockchain.

**Request Body:**
```json
{
  "hashlock": "0x1234567890abcdef...",
  "makerAddress": "0x5a901138b890f9aa4da23d2742c79974ea3cafef130589dc867adc09bd690b5a",
  "timelock": 1703123456,
  "amount": "0.001"
}
```

**Response:**
```json
{
  "success": true,
  "txHash": "0xabc123...",
  "address": "0xresolverAddress..."
}
```

### Complete Bitcoin Swap
```
POST /complete/bitcoin
```
Completes a Bitcoin swap by revealing the secret.

**Request Body:**
```json
{
  "txid": "abc123...",
  "vout": 0,
  "secret": "0x1234567890abcdef...",
  "lockTime": 1703123456,
  "amount": 100000,
  "senderPubKey": "0x1234567890abcdef..."
}
```

## Setup

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Configure Environment:**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

3. **Start the Service:**
   ```bash
   npm start
   ```

4. **Test Endpoints:**
   ```bash
   node test-endpoints.js
   ```

## Environment Variables

### Ethereum Configuration
- `ETHEREUM_RPC_URL`: Ethereum RPC endpoint
- `ETHEREUM_PRIVATE_KEY`: Resolver's Ethereum private key
- `ETHEREUM_CONTRACT_ADDRESS`: Atomic swap contract address

### Aptos Configuration
- `APTOS_NODE_URL`: Aptos node URL
- `APTOS_PRIVATE_KEY`: Resolver's Aptos private key
- `APTOS_ACCOUNT_ADDRESS`: Resolver's Aptos account address
- `APTOS_CONTRACT_ADDRESS`: Atomic swap contract address
- `APTOS_MODULE_NAME`: Contract module name
- `APTOS_API_KEY`: Aptos API key (optional)

### Bitcoin Configuration
- `BITCOIN_NETWORK`: Bitcoin network (regtest/testnet/mainnet)
- `BITCOIN_RPC_URL`: Bitcoin RPC endpoint
- `BITCOIN_RPC_USERNAME`: Bitcoin RPC username
- `BITCOIN_RPC_PASSWORD`: Bitcoin RPC password

## Usage Example

```javascript
// Create Ethereum counter swap
const response = await fetch('http://localhost:3002/swap/ethereum', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    hashlock: '0x1234567890abcdef...',
    makerAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
    timelock: Math.floor(Date.now() / 1000) + 3600,
    amount: '0.001'
  })
});

const result = await response.json();
console.log('Counter swap created:', result.txHash);
```

## Architecture

The resolver service acts as a bridge between different blockchains, creating counter swaps when profitable opportunities are detected. It maintains private keys for each supported blockchain and can execute transactions on behalf of the resolver.

## Security

- Private keys should be stored securely
- Use environment variables for sensitive configuration
- Implement proper authentication for production use
- Monitor transaction gas costs and network conditions 