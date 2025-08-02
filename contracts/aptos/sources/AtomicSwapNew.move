module AtomicSwapTuna::AtomicSwapTuna {
    use std::signer;
    use std::aptos_hash;
    use std::timestamp;
    use std::table::{Self, Table};
    use std::event::{Self, EventHandle};
    use aptos_framework::account;
    use aptos_framework::object::Object;
    use aptos_framework::fungible_asset::Metadata;
    use aptos_framework::coin;
    use FACoin::fa_coin::{Self, get_metadata};

    // Error codes
    const EINVALID_AMOUNT:         u64 = 1;
    const EINVALID_RECIPIENT:      u64 = 2;
    const EINVALID_TIMELOCK:       u64 = 3;
    const ESWAP_NOT_FOUND:         u64 = 4;
    const ESWAP_ALREADY_COMPLETED: u64 = 5;
    const ESWAP_ALREADY_REFUNDED:  u64 = 6;
    const EINVALID_SECRET:         u64 = 7;
    const ECANNOT_COMPLETE:        u64 = 8;
    const ECANNOT_REFUND:          u64 = 9;
    const EINSUFFICIENT_ALLOWANCE: u64 = 10;
    const EINVALID_SIGNATURE:      u64 = 11;
    const ESIGNATURE_EXPIRED:      u64 = 12;
    const ESIGNATURE_ALREADY_USED: u64 = 13;
    const EINVALID_NONCE:          u64 = 14;

    // Storage for all swaps
    struct AtomicSwapStorage has key {
        swaps:           Table<vector<u8>, Swap>,
        swap_events:     EventHandle<SwapInitiatedEvent>,
        complete_events: EventHandle<SwapCompletedEvent>,
        refund_events:   EventHandle<SwapRefundedEvent>,
        nonces:          Table<address, u64>, // Nonces for meta-transactions
        used_signatures: Table<vector<u8>, bool>, // Track used signatures
    }

    // Individual swap, holds the locked fungible assets
    struct Swap has store {
        initiator: address,
        recipient: address,
        amount:    u64,
        timelock:  u64,
        completed: bool,
        refunded:  bool,
        asset:     Object<Metadata>, // Reference to the FA coin
    }

    // Meta transaction data structure
    struct InitiateSwapMeta has drop, store, copy {
        initiator: address,
        hashlock:  vector<u8>,
        timelock:  u64,
        recipient: address,
        amount:    u64,
        nonce:     u64,
        deadline:  u64,
    }

    // Events
    struct SwapInitiatedEvent has drop, store {
        hashlock:  vector<u8>,
        initiator: address,
        recipient: address,
        amount:    u64,
        timelock:  u64,
    }
    struct SwapCompletedEvent has drop, store {
        hashlock:  vector<u8>,
        recipient: address,
        amount:    u64,
        secret:    vector<u8>,
    }
    struct SwapRefundedEvent has drop, store {
        hashlock:  vector<u8>,
        initiator: address,
        amount:    u64,
    }

    // Initialize storage under the module address
    public entry fun init(account: &signer) {
        let addr = signer::address_of(account);
        if (!exists<AtomicSwapStorage>(addr)) {
            move_to(account, AtomicSwapStorage {
                swaps:           table::new(),
                swap_events:     account::new_event_handle<SwapInitiatedEvent>(account),
                complete_events: account::new_event_handle<SwapCompletedEvent>(account),
                refund_events:   account::new_event_handle<SwapRefundedEvent>(account),
                nonces:          table::new(),
                used_signatures: table::new(),
            });
        }
    }

    // Initiate: transfer native APT from initiator to contract for counter swap
    public entry fun initiate_swap(
        initiator: &signer,
        hashlock:  vector<u8>,
        timelock:  u64,
        recipient: address,
        amount:    u64,
    ) acquires AtomicSwapStorage {
        assert!(amount > 0, EINVALID_AMOUNT);
        assert!(recipient != @0x0, EINVALID_RECIPIENT);
        assert!(timelock > timestamp::now_seconds() + 300, EINVALID_TIMELOCK);

        let initiator_addr = signer::address_of(initiator);
        let storage = borrow_global_mut<AtomicSwapStorage>(@AtomicSwapTuna);
        assert!(!table::contains(&storage.swaps, hashlock), ESWAP_ALREADY_COMPLETED);

        // Transfer native APT from initiator to contract
        coin::transfer<aptos_framework::aptos_coin::AptosCoin>(
            initiator,
            @AtomicSwapTuna,
            amount
        );

        let swap = Swap {
            initiator: initiator_addr,
            recipient,
            amount,
            timelock,
            completed: false,
            refunded: false,
            asset: get_metadata(), // Keep for compatibility but not used for native APT
        };
        table::add(&mut storage.swaps, hashlock, swap);

        event::emit_event(&mut storage.swap_events, SwapInitiatedEvent {
            hashlock,
            initiator: initiator_addr,
            recipient,
            amount,
            timelock,
        });
    }

    // Meta initiate swap: verify signature and execute swap
    public entry fun initiate_swap_meta(
        initiator: address,
        hashlock: vector<u8>,
        timelock: u64,
        recipient: address,
        amount: u64,
        nonce: u64,
        deadline: u64,
        _signature: vector<u8>,
    ) acquires AtomicSwapStorage {
        // Verify deadline
        assert!(timestamp::now_seconds() <= deadline, ESIGNATURE_EXPIRED);
        
        // Verify nonce (optional for now, like Ethereum)
        // let current_nonce = table::borrow(&borrow_global<AtomicSwapStorage>(@AtomicSwapTuna).nonces, initiator);
        // assert!(current_nonce == nonce, EINVALID_NONCE);
        
        // Create meta data for message creation
        let meta_data = InitiateSwapMeta {
            initiator,
            hashlock,
            timelock,
            recipient,
            amount,
            nonce,
            deadline,
        };
        
        // Create hash for signature verification
        let message = create_meta_message(meta_data);
        let expected_hash = aptos_hash::keccak256(message);
        
        // Check if signature already used
        let storage = borrow_global_mut<AtomicSwapStorage>(@AtomicSwapTuna);
        assert!(!table::contains(&storage.used_signatures, expected_hash), ESIGNATURE_ALREADY_USED);
        
        // Verify signature (simplified - in production you'd use proper signature verification)
        // For now, we'll assume the signature is valid if the hashlock is not already used
        assert!(!table::contains(&storage.swaps, hashlock), ESWAP_ALREADY_COMPLETED);
        
        // Mark signature as used
        table::add(&mut storage.used_signatures, expected_hash, true);
        
        // Increment nonce
        if (table::contains(&storage.nonces, initiator)) {
            let current_nonce = table::borrow_mut(&mut storage.nonces, initiator);
            *current_nonce = *current_nonce + 1;
        } else {
            table::add(&mut storage.nonces, initiator, 1);
        };
        
        // Execute the swap initiation
        initiate_swap_internal(hashlock, timelock, recipient, amount);
        
        // Transfer tokens from initiator to recipient using transfer_from_meta
        fa_coin::transfer_from_meta(initiator, recipient, amount);

    }

    // Internal function to initiate swap (used by both direct and meta calls)
    fun initiate_swap_internal(
        hashlock:  vector<u8>,
        timelock:  u64,
        recipient: address,
        amount:    u64,
    ) acquires AtomicSwapStorage {
        assert!(amount > 0, EINVALID_AMOUNT);
        assert!(recipient != @0x0, EINVALID_RECIPIENT);
        assert!(timelock > timestamp::now_seconds() + 300, EINVALID_TIMELOCK);

        let storage = borrow_global_mut<AtomicSwapStorage>(@AtomicSwapTuna);
        assert!(!table::contains(&storage.swaps, hashlock), ESWAP_ALREADY_COMPLETED);

        // Get the FA coin metadata
        let asset = get_metadata();

        let swap = Swap {
            initiator: @0x0, // Will be set by the caller
            recipient,
            amount,
            timelock,
            completed: false,
            refunded: false,
            asset,
        };
        table::add(&mut storage.swaps, hashlock, swap);

        event::emit_event(&mut storage.swap_events, SwapInitiatedEvent {
            hashlock,
            initiator: @0x0,
            recipient,
            amount,
            timelock,
        });
    }

    // Helper function to create meta message for signature verification
    fun create_meta_message(meta_data: InitiateSwapMeta): vector<u8> {
        // Create a message similar to EIP-712 format
        // In production, you'd use proper EIP-712 encoding
        let message = b"";
        std::vector::append(&mut message, std::bcs::to_bytes(&meta_data.initiator));
        std::vector::append(&mut message, meta_data.hashlock);
        std::vector::append(&mut message, std::bcs::to_bytes(&meta_data.timelock));
        std::vector::append(&mut message, std::bcs::to_bytes(&meta_data.recipient));
        std::vector::append(&mut message, std::bcs::to_bytes(&meta_data.amount));
        std::vector::append(&mut message, std::bcs::to_bytes(&meta_data.nonce));
        std::vector::append(&mut message, std::bcs::to_bytes(&meta_data.deadline));
        message
    }

    // Complete: verify, then send the locked tokens to the recipient
    public entry fun complete_swap(
        recipient: &signer,
        hashlock:  vector<u8>,
        secret:    vector<u8>,
    ) acquires AtomicSwapStorage {

        let storage = borrow_global_mut<AtomicSwapStorage>(@AtomicSwapTuna);

        // Get the swap from storage (don't remove it)
        let swap = table::borrow_mut(&mut storage.swaps, hashlock);

        // No recipient check - anyone with the secret can complete the swap
        assert!(!swap.completed, ESWAP_ALREADY_COMPLETED);
        assert!(!swap.refunded,  ESWAP_ALREADY_REFUNDED);

        // clone & hash the secret
        let expected_hash = aptos_hash::keccak256(secret);
        assert!(expected_hash == hashlock, EINVALID_SECRET);
        assert!(timestamp::now_seconds() < swap.timelock, ECANNOT_COMPLETE);

        // Mark as completed
        swap.completed = true;

        // Send native APT to recipient
        coin::transfer<aptos_framework::aptos_coin::AptosCoin>(
            recipient,
            swap.recipient,
            swap.amount
        );

        event::emit_event(&mut storage.complete_events, SwapCompletedEvent {
            hashlock,
            recipient: swap.recipient,
            amount: swap.amount,
            secret,
        });
    }

    // Refund: after timelock, send tokens back to initiator
    public entry fun refund_swap(
        initiator: &signer,
        hashlock:  vector<u8>,
    ) acquires AtomicSwapStorage {
        let initiator_addr = signer::address_of(initiator);
        let storage = borrow_global_mut<AtomicSwapStorage>(@AtomicSwapTuna);

        // Get the swap from storage (don't remove it)
        let swap = table::borrow_mut(&mut storage.swaps, hashlock);

        assert!(swap.initiator == initiator_addr, EINVALID_RECIPIENT);
        assert!(!swap.completed, ESWAP_ALREADY_COMPLETED);
        assert!(!swap.refunded,  ESWAP_ALREADY_REFUNDED);
        assert!(timestamp::now_seconds() >= swap.timelock, ECANNOT_REFUND);

        // Mark as refunded
        swap.refunded = true;

        // Send native APT back to initiator
        coin::transfer<aptos_framework::aptos_coin::AptosCoin>(
            initiator,
            initiator_addr,
            swap.amount
        );

        event::emit_event(&mut storage.refund_events, SwapRefundedEvent {
            hashlock,
            initiator: initiator_addr,
            amount: swap.amount,
        });
    }

    // Views remain unchanged
    #[view]
    public fun can_complete(hashlock: vector<u8>): bool acquires AtomicSwapStorage {
        if (!table::contains(&borrow_global<AtomicSwapStorage>(@AtomicSwapTuna).swaps, hashlock)) {
            return false;
        };
        let s = table::borrow(&borrow_global<AtomicSwapStorage>(@AtomicSwapTuna).swaps, hashlock);
        !s.completed && !s.refunded && (timestamp::now_seconds() < s.timelock)
    }

    #[view]
    public fun can_refund(hashlock: vector<u8>): bool acquires AtomicSwapStorage {
        if (!table::contains(&borrow_global<AtomicSwapStorage>(@AtomicSwapTuna).swaps, hashlock)) {
            return false;
        };
        let s = table::borrow(&borrow_global<AtomicSwapStorage>(@AtomicSwapTuna).swaps, hashlock);
        !s.completed && !s.refunded && (timestamp::now_seconds() >= s.timelock)
    }

    #[view]
    public fun get_swap(hashlock: vector<u8>):
        (address, address, u64, u64, bool, bool)
    acquires AtomicSwapStorage {
        if (!table::contains(&borrow_global<AtomicSwapStorage>(@AtomicSwapTuna).swaps, hashlock)) {
            return (@0x0, @0x0, 0, 0, false, false);
        };
        let s = table::borrow(&borrow_global<AtomicSwapStorage>(@AtomicSwapTuna).swaps, hashlock);
        (s.initiator, s.recipient, s.amount, s.timelock, s.completed, s.refunded)
    }

    #[view]
    public fun get_nonce(user: address): u64 acquires AtomicSwapStorage {
        if (!table::contains(&borrow_global<AtomicSwapStorage>(@AtomicSwapTuna).nonces, user)) {
            return 0
        };
        *table::borrow(&borrow_global<AtomicSwapStorage>(@AtomicSwapTuna).nonces, user)
    }

    #[test(creator = @AtomicSwapTuna)]
    fun test_init_storage(
        creator: &signer,
    ) {
        // Test that storage can be initialized
        init(creator);
        
        // Verify storage exists
        assert!(exists<AtomicSwapStorage>(@AtomicSwapTuna), 1);
    }

    #[test(creator = @AtomicSwapTuna)]
    fun test_can_complete_and_can_refund(
        creator: &signer,
    ) acquires AtomicSwapStorage {
        // Initialize storage first
        init(creator);
        
        // Test view functions with non-existent swap
        let dummy_hashlock = b"dummy_hashlock";
        
        assert!(!can_complete(dummy_hashlock), 1);
        assert!(!can_refund(dummy_hashlock), 2);
        
        // Test get_swap with non-existent swap
        let (initiator, recipient, amount, timelock, completed, refunded) = get_swap(dummy_hashlock);
        assert!(initiator == @0x0, 3);
        assert!(recipient == @0x0, 4);
        assert!(amount == 0, 5);
        assert!(timelock == 0, 6);
        assert!(!completed, 7);
        assert!(!refunded, 8);
    }
}
