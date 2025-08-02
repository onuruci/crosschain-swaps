# Aptos Contract Deployment Information

## New Account Details
- **Account Address:** `0xa89f86c9718dacde29820358fbfefedf099425ba278549396dee6cf5ca30d717`
- **Profile Name:** `new_account`
- **Network:** Testnet

## Deployed Modules

### 1. FA Coin Module
- **Module Name:** `fa_coin`
- **Full Address:** `0xa89f86c9718dacde29820358fbfefedf099425ba278549396dee6cf5ca30d717::fa_coin`
- **Metadata Object:** `0x7e964089348645d587d6f310c70d9f62b88038bd83789890a13afd47b8a04dcf`

### 2. Atomic Swap Module
- **Module Name:** `AtomicSwapFinal`
- **Full Address:** `0xa89f86c9718dacde29820358fbfefedf099425ba278549396dee6cf5ca30d717::AtomicSwapFinal`

## Deployment Transactions
- **Contract Deployment:** `0x93330f61f798c621a00f3899e587f1c81a320d58304d5650bbfa4cf74c3182fe`
- **Storage Initialization:** `0xcdadf916d5f2932b7d19eabb7354b038166d5ac595de02731262e2b6b6ed2e0e`

## Configuration Updates Required

### Frontend (`frontend/src/config/index.ts`)
```typescript
aptos: {
  // ... other config
  faCoinAddress: '0xa89f86c9718dacde29820358fbfefedf099425ba278549396dee6cf5ca30d717::fa_coin',
  moduleName: 'AtomicSwapFinal',
}
```

### Move.toml
```toml
[addresses]
FACoin = "0xa89f86c9718dacde29820358fbfefedf099425ba278549396dee6cf5ca30d717"
AtomicSwapFinal = "0xa89f86c9718dacde29820358fbfefedf099425ba278549396dee6cf5ca30d717"
```

## Features Available
- ✅ FA Coin with `wrap_apt` and `unwrap` functions
- ✅ FA Coin approval system (`approve`, `allowance`, `transfer_from`)
- ✅ Atomic Swap with meta-transaction support
- ✅ `initiate_swap_meta` function for gasless transactions
- ✅ Nonce management for replay protection
- ✅ Signature verification for meta-transactions

## Testing Commands
```bash
# Test nonce retrieval
aptos move view --function-id 0xa89f86c9718dacde29820358fbfefedf099425ba278549396dee6cf5ca30d717::AtomicSwapFinal::get_nonce --args address:0xa89f86c9718dacde29820358fbfefedf099425ba278549396dee6cf5ca30d717

# Test FA Coin metadata
aptos move view --function-id 0xa89f86c9718dacde29820358fbfefedf099425ba278549396dee6cf5ca30d717::fa_coin::get_metadata
```

## Next Steps
1. Update frontend configuration with new addresses
2. Test the 3-step Aptos swap flow (Convert APT → Approve FA Coin → Sign Meta Transaction)
3. Test cross-chain swaps between Ethereum and Aptos 