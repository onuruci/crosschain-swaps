module AtomicSwapNew::AtomicSwapV3 {
    use std::signer;
    use std::aptos_hash;
    use std::timestamp;
    use std::table::{Self, Table};
    use std::event::{Self, EventHandle};
    use std::vector;
    use aptos_framework::account;
    use aptos_framework::coin::{Coin, withdraw, deposit};
    use aptos_framework::aptos_coin::AptosCoin;

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

    // Storage for all swaps
    struct AtomicSwapStorage has key {
        swaps:           Table<vector<u8>, Swap>,
        swap_events:     EventHandle<SwapInitiatedEvent>,
        complete_events: EventHandle<SwapCompletedEvent>,
        refund_events:   EventHandle<SwapRefundedEvent>,
    }

    // Individual swap, holds the locked coins
    struct Swap has store {
        initiator: address,
        recipient: address,
        amount:    u64,
        timelock:  u64,
        completed: bool,
        refunded:  bool,
        coins:     Coin<AptosCoin>,
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
            });
        }
    }

    // Initiate: withdraw APT and lock it
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
        let storage = borrow_global_mut<AtomicSwapStorage>(@AtomicSwapNew);
        assert!(!table::contains(&storage.swaps, hashlock), ESWAP_ALREADY_COMPLETED);

        // pull coins out of initiator
        let locked_coins: Coin<AptosCoin> = withdraw<AptosCoin>(initiator, amount);

        let swap = Swap {
            initiator: initiator_addr,
            recipient,
            amount,
            timelock,
            completed: false,
            refunded: false,
            coins: locked_coins,
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

    // Complete: verify, then send the locked coins to the recipient
    public entry fun complete_swap(
        recipient: &signer,
        hashlock:  vector<u8>,
        secret:    vector<u8>,
    ) acquires AtomicSwapStorage {
        let recipient_addr = signer::address_of(recipient);
        let storage = borrow_global_mut<AtomicSwapStorage>(@AtomicSwapNew);

        // remove & fully move out the Swap resource
        let Swap {
            initiator: _,
            recipient: swap_recipient,
            amount: swap_amount,
            timelock: swap_timelock,
            completed: swap_completed,
            refunded: swap_refunded,
            coins: swap_coins,
        } = table::remove(&mut storage.swaps, hashlock);

        assert!(swap_recipient == recipient_addr, EINVALID_RECIPIENT);
        assert!(!swap_completed, ESWAP_ALREADY_COMPLETED);
        assert!(!swap_refunded,  ESWAP_ALREADY_REFUNDED);

        // clone & hash the secret
        let expected_hash = aptos_hash::keccak256(secret);
        assert!(expected_hash == hashlock, EINVALID_SECRET);
        assert!(timestamp::now_seconds() < swap_timelock, ECANNOT_COMPLETE);

        // deposit into recipient’s account
        deposit<AptosCoin>(recipient_addr, swap_coins);

        event::emit_event(&mut storage.complete_events, SwapCompletedEvent {
            hashlock,
            recipient: recipient_addr,
            amount: swap_amount,
            secret,
        });
    }

    // Refund: after timelock, send coins back to initiator
    public entry fun refund_swap(
        initiator: &signer,
        hashlock:  vector<u8>,
    ) acquires AtomicSwapStorage {
        let initiator_addr = signer::address_of(initiator);
        let storage = borrow_global_mut<AtomicSwapStorage>(@AtomicSwapNew);

        // remove & fully move out the Swap resource
        let Swap {
            initiator: swap_initiator,
            recipient: _,
            amount: swap_amount,
            timelock: swap_timelock,
            completed: swap_completed,
            refunded: swap_refunded,
            coins: swap_coins,
        } = table::remove(&mut storage.swaps, hashlock);

        assert!(swap_initiator == initiator_addr, EINVALID_RECIPIENT);
        assert!(!swap_completed, ESWAP_ALREADY_COMPLETED);
        assert!(!swap_refunded,  ESWAP_ALREADY_REFUNDED);
        assert!(timestamp::now_seconds() >= swap_timelock, ECANNOT_REFUND);

        // return coins to initiator
        deposit<AptosCoin>(initiator_addr, swap_coins);

        event::emit_event(&mut storage.refund_events, SwapRefundedEvent {
            hashlock,
            initiator: initiator_addr,
            amount: swap_amount,
        });
    }

    // Views remain unchanged
    #[view]
    public fun can_complete(hashlock: vector<u8>): bool acquires AtomicSwapStorage {
        if (!table::contains(&borrow_global<AtomicSwapStorage>(@AtomicSwapNew).swaps, hashlock)) {
            return false;
        };
        let s = table::borrow(&borrow_global<AtomicSwapStorage>(@AtomicSwapNew).swaps, hashlock);
        !s.completed && !s.refunded && (timestamp::now_seconds() < s.timelock)
    }

    #[view]
    public fun can_refund(hashlock: vector<u8>): bool acquires AtomicSwapStorage {
        if (!table::contains(&borrow_global<AtomicSwapStorage>(@AtomicSwapNew).swaps, hashlock)) {
            return false;
        };
        let s = table::borrow(&borrow_global<AtomicSwapStorage>(@AtomicSwapNew).swaps, hashlock);
        !s.completed && !s.refunded && (timestamp::now_seconds() >= s.timelock)
    }

    #[view]
    public fun get_swap(hashlock: vector<u8>):
        (address, address, u64, u64, bool, bool)
    acquires AtomicSwapStorage {
        if (!table::contains(&borrow_global<AtomicSwapStorage>(@AtomicSwapNew).swaps, hashlock)) {
            return (@0x0, @0x0, 0, 0, false, false);
        };
        let s = table::borrow(&borrow_global<AtomicSwapStorage>(@AtomicSwapNew).swaps, hashlock);
        (s.initiator, s.recipient, s.amount, s.timelock, s.completed, s.refunded)
    }
}
