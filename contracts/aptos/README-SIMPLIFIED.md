# Simplified Atomic Swap Contract

This is a simplified version of the Move atomic swap contract that works exactly like the Solidity implementation.

## Key Changes from Original

### 1. **Global Storage Instead of Per-Account Storage**

**Before (Complex):**
```move
// Each user had their own SwapBook
struct SwapBook has key {
    swaps: vector<Swap>,
}
```

**After (Simple):**
```move
// Global storage like Solidity
struct AtomicSwapStorage has key {
    swaps: Table<vector<u8>, Swap>,
    hashlock_used: Table<vector<u8>, bool>,
}
```

### 2. **Direct Function Calls Instead of Complex Lookups**

**Before:**
```move
// Had to know which account had the swap and search through their SwapBook
let swap_index = find_swap_by_hashlock(&borrow_global_mut<SwapBook>(initiator).swaps, &hashlock);
```

**After:**
```move
// Direct lookup like Solidity mapping
let swap = table::borrow_mut(&mut borrow_global_mut<AtomicSwapStorage>(@atomic_swap).swaps, hashlock);
```

### 3. **Removed Complex Secret Registry**

The original contract had a complex `SecretRegistry` system. The simplified version works exactly like Solidity - secrets are provided directly during completion.

### 4. **Simplified Event Monitoring**

The simplified contract emits events in a format that's easier to monitor and process.

## Contract Functions

### Core Functions (Match Solidity Exactly)

1. **`initiate_swap`** - Create a new atomic swap
2. **`complete_swap`** - Complete a swap by providing the secret
3. **`complete_swap_as_initiator`** - Complete swap as initiator (for cross-chain)
4. **`refund_swap`** - Refund a swap after timelock expires

### View Functions (Match Solidity Exactly)

1. **`get_swap`** - Get swap details
2. **`can_complete`** - Check if swap can be completed
3. **`can_refund`** - Check if swap can be refunded

## Deployment

```bash
# Set your private key
export APTOS_PRIVATE_KEY=0x1234567890abcdef...

# Deploy the contract
node deploy-simplified.js
```

## Testing

```bash
# Set contract address after deployment
export CONTRACT_ADDRESS=0x1234567890abcdef...::AtomicSwap

# Run tests
node test-simplified.js
```

## Backend Integration

The backend relayer has been updated to work with the simplified contract:

1. **`aptos-client.js`** - Updated to use direct function calls
2. **`swap-manager.js`** - Updated to work with global storage
3. **`index.js`** - Updated API endpoints

## Benefits of Simplified Version

1. **Easier to Understand** - Matches Solidity implementation exactly
2. **Better Performance** - Direct lookups instead of searching through vectors
3. **Simpler Backend** - No need to track which account has which swap
4. **Better Event Monitoring** - Cleaner event structure
5. **Easier Testing** - Straightforward function calls

## Migration from Original Contract

If you have existing swaps on the original contract:

1. Deploy the simplified contract
2. Update your backend configuration to use the new contract address
3. The relayer will automatically start monitoring the new contract
4. Old swaps will remain on the original contract but won't be monitored

## Configuration

Update your backend config to use the new contract:

```javascript
// backend/relayer/config/config.js
module.exports = {
  aptos: {
    nodeUrl: 'https://fullnode.testnet.aptoslabs.com',
    contractAddress: '0x1234567890abcdef...::AtomicSwap', // New simplified contract
    privateKey: process.env.APTOS_PRIVATE_KEY
  }
  // ... rest of config
};
```

## Error Handling

The simplified contract uses the same error codes as Solidity:

- `ENOT_FOUND` - Swap not found
- `EALREADY_COMPLETED` - Swap already completed
- `EALREADY_REFUNDED` - Swap already refunded
- `EINVALID_SECRET` - Invalid secret provided
- `ETIMELOCK_NOT_EXPIRED` - Timelock not expired for refund
- `ETIMELOCK_EXPIRED` - Timelock expired for completion
- `EINVALID_RECIPIENT` - Invalid recipient address
- `EINVALID_AMOUNT` - Invalid amount
- `EHASHLOCK_ALREADY_USED` - Hashlock already used
- `EINVALID_TIMELOCK` - Invalid timelock duration

## Security

The simplified contract maintains the same security guarantees as the original:

- Hashlock verification
- Timelock enforcement
- Recipient-only completion
- Initiator-only refund
- Atomic operations

The main difference is that it's much simpler to understand and use, making it less prone to implementation errors. 