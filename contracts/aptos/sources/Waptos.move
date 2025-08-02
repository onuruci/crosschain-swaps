/// A 2-in-1 module that combines managed_fungible_asset and coin_example into one module that when deployed, the
/// deployer will be creating a new managed fungible asset with the hardcoded supply config, name, symbol, and decimals.
/// The address of the asset can be obtained via get_metadata(). As a simple version, it only deals with primary stores.
module FACoin::fa_coin {
    use aptos_framework::fungible_asset::{Self, MintRef, TransferRef, BurnRef, Metadata, FungibleAsset};
    use aptos_framework::object::{Self, Object};
    use aptos_framework::primary_fungible_store;
    use aptos_framework::function_info;
    use aptos_framework::dispatchable_fungible_asset;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;
    use std::error;
    use std::signer;
    use std::string::{Self, utf8};
    use std::option;
    use std::table::{Self, Table};


    /// Only fungible asset metadata owner can make changes.
    const ENOT_OWNER: u64 = 1;
    /// The FA coin is paused.
    const EPAUSED: u64 = 2;
    /// Insufficient allowance for transfer.
    const EINSUFFICIENT_ALLOWANCE: u64 = 3;

    const ASSET_SYMBOL: vector<u8> = b"FA";

    #[resource_group_member(group = aptos_framework::object::ObjectGroup)]
    /// Hold refs to control the minting, transfer and burning of fungible assets.
    struct ManagedFungibleAsset has key {
        mint_ref: MintRef,
        transfer_ref: TransferRef,
        burn_ref: BurnRef,
        extend_ref: object::ExtendRef,
    }

    #[resource_group_member(group = aptos_framework::object::ObjectGroup)]
    /// Global state to pause the FA coin.
    /// OPTIONAL
    struct State has key {
        paused: bool,
    }

    /// Approval storage for each account
    struct Approvals has key {
        approvals: Table<address, u64>, // spender -> amount
    }

    /// Initialize metadata object and store the refs.
    // :!:>initialize
    fun init_module(admin: &signer) {
        let constructor_ref = &object::create_named_object(admin, ASSET_SYMBOL);
        primary_fungible_store::create_primary_store_enabled_fungible_asset(
            constructor_ref,
            option::none(),
            utf8(b"Wrapped APT"), /* name */
            utf8(ASSET_SYMBOL), /* symbol */
            8, /* decimals */
            utf8(b"http://example.com/favicon.ico"), /* icon */
            utf8(b"http://example.com"), /* project */
        );

        // Create mint/burn/transfer refs to allow creator to manage the fungible asset.
        let mint_ref = fungible_asset::generate_mint_ref(constructor_ref);
        let burn_ref = fungible_asset::generate_burn_ref(constructor_ref);
        let transfer_ref = fungible_asset::generate_transfer_ref(constructor_ref);
        let extend_ref = object::generate_extend_ref(constructor_ref);
        let metadata_object_signer = object::generate_signer(constructor_ref);
        move_to(
            &metadata_object_signer,
            ManagedFungibleAsset { mint_ref, transfer_ref, burn_ref, extend_ref }
        ); // <:!:initialize

        // Create a global state to pause the FA coin and move to Metadata object.
        move_to(
            &metadata_object_signer,
            State { paused: false, }
        );


    }

    #[view]
    /// Return the address of the managed fungible asset that's created when this module is deployed.
    public fun get_metadata(): Object<Metadata> {
        let asset_address = object::create_object_address(&@FACoin, ASSET_SYMBOL);
        object::address_to_object<Metadata>(asset_address)
    }

    /// Initialize the FA coin module (call this after deployment)
    public entry fun initialize_fa_coin(admin: &signer) {
        init_module(admin);
    }

    

    /// Deposit native APT and give FA coins
    public entry fun deposit_apt(user: &signer, amount: u64) acquires ManagedFungibleAsset {
        let user_addr = signer::address_of(user);
        let asset = get_metadata();
        
        // Get the managed fungible asset refs from the metadata object
        let managed_fungible_asset = borrow_global<ManagedFungibleAsset>(object::object_address(&asset));
        
        // Withdraw APT from user's account
        let apt_coins = coin::withdraw<AptosCoin>(user, amount);
        
        // Mint new FA coins and give to user's account
        let to_wallet = primary_fungible_store::ensure_primary_store_exists(user_addr, asset);
        let fa = fungible_asset::mint(&managed_fungible_asset.mint_ref, amount);
        fungible_asset::deposit_with_ref(&managed_fungible_asset.transfer_ref, to_wallet, fa);
        
        // Store the APT coins in the contract
        let metadata_signer = object::generate_signer_for_extending(&managed_fungible_asset.extend_ref);
        coin::deposit(signer::address_of(&metadata_signer), apt_coins);
    }



    /// Withdraw function override to ensure that the account is not denylisted and the FA coin is not paused.
    /// OPTIONAL
    public fun withdraw<T: key>(
        store: Object<T>,
        amount: u64,
        transfer_ref: &TransferRef,
    ): FungibleAsset {
        fungible_asset::withdraw_with_ref(transfer_ref, store, amount)
    }

    /// Withdraw FA coins and give native APT
    public entry fun withdraw_apt(user: &signer, amount: u64) acquires ManagedFungibleAsset {
        let user_addr = signer::address_of(user);
        let asset = get_metadata();
        
        // Get the managed fungible asset refs from the metadata object
        let managed_fungible_asset = borrow_global<ManagedFungibleAsset>(object::object_address(&asset));
        
        // Withdraw and burn FA coins from user's account
        let user_wallet = primary_fungible_store::primary_store(user_addr, asset);
        fungible_asset::burn_from(&managed_fungible_asset.burn_ref, user_wallet, amount);
        
        // Give native APT to user from the contract's stored APT
        let metadata_signer = object::generate_signer_for_extending(&managed_fungible_asset.extend_ref);
        let native_apt = coin::withdraw<AptosCoin>(&metadata_signer, amount);
        coin::deposit(user_addr, native_apt);
    }


    /// Borrow the immutable reference of the refs of `metadata`.
    /// This validates that the signer is the metadata object's owner.
    inline fun authorized_borrow_refs(
        owner: &signer,
        asset: Object<Metadata>,
    ): &ManagedFungibleAsset acquires ManagedFungibleAsset {
        assert!(object::is_owner(asset, signer::address_of(owner)), error::permission_denied(ENOT_OWNER));
        borrow_global<ManagedFungibleAsset>(object::object_address(&asset))
    }

    // ===== APPROVAL SYSTEM =====

    /// Approve a spender to spend tokens on behalf of the owner
    public entry fun approve(
        owner: &signer,
        spender: address,
        amount: u64
    ) acquires Approvals {
        let owner_addr = signer::address_of(owner);
        if (!exists<Approvals>(owner_addr)) {
            move_to(owner, Approvals {
                approvals: table::new()
            });
        };
        let approvals = borrow_global_mut<Approvals>(owner_addr);
        table::add(&mut approvals.approvals, spender, amount);
    }

    /// Get the allowance for a spender
    #[view]
    public fun allowance(owner: address, spender: address): u64 acquires Approvals {
        if (!exists<Approvals>(owner)) {
            return 0
        };
        let approvals = borrow_global<Approvals>(owner);
        if (!table::contains(&approvals.approvals, spender)) {
            return 0
        };
        *table::borrow(&approvals.approvals, spender)
    }

    /// Transfer tokens from one address to another using allowance
    public entry fun transfer_from(
        spender: &signer,
        from: address,
        to: address,
        amount: u64
    ) acquires ManagedFungibleAsset, Approvals {
        // Check allowance
        let spender_addr = signer::address_of(spender);
        assert!(exists<Approvals>(from), EINSUFFICIENT_ALLOWANCE);
        let approvals = borrow_global_mut<Approvals>(from);
        assert!(table::contains(&approvals.approvals, spender_addr), EINSUFFICIENT_ALLOWANCE);
        let current_allowance = table::borrow_mut(&mut approvals.approvals, spender_addr);
        assert!(*current_allowance >= amount, EINSUFFICIENT_ALLOWANCE);
        
        // Reduce allowance
        *current_allowance = *current_allowance - amount;
        
        // Perform the transfer
        let asset = get_metadata();
        let managed_fungible_asset = borrow_global<ManagedFungibleAsset>(object::object_address(&asset));
        let from_wallet = primary_fungible_store::primary_store(from, asset);
        let to_wallet = primary_fungible_store::ensure_primary_store_exists(to, asset);
        let fa = fungible_asset::withdraw_with_ref(&managed_fungible_asset.transfer_ref, from_wallet, amount);
        fungible_asset::deposit_with_ref(&managed_fungible_asset.transfer_ref, to_wallet, fa);
    }

    /// Increase allowance for a spender
    public entry fun increase_allowance(
        owner: &signer,
        spender: address,
        amount: u64
    ) acquires Approvals {
        let owner_addr = signer::address_of(owner);
        if (!exists<Approvals>(owner_addr)) {
            move_to(owner, Approvals {
                approvals: table::new()
            });
        };
        let approvals = borrow_global_mut<Approvals>(owner_addr);
        if (!table::contains(&approvals.approvals, spender)) {
            table::add(&mut approvals.approvals, spender, amount);
        } else {
            let current_allowance = table::borrow_mut(&mut approvals.approvals, spender);
            *current_allowance = *current_allowance + amount;
        };
    }

    /// Transfer from initiator to recipient (for meta-transactions)
    public entry fun transfer_from_meta(
        from: address,
        to: address,
        amount: u64
    ) acquires ManagedFungibleAsset, Approvals {
        // Check if contract has allowance to spend tokens on behalf of 'from'
        assert!(exists<Approvals>(from), EINSUFFICIENT_ALLOWANCE);
        let approvals = borrow_global_mut<Approvals>(from);
        assert!(table::contains(&approvals.approvals, @AtomicSwapTuna), EINSUFFICIENT_ALLOWANCE);
        let current_allowance = table::borrow_mut(&mut approvals.approvals, @AtomicSwapTuna);
        assert!(*current_allowance >= amount, EINSUFFICIENT_ALLOWANCE);
        
        // Reduce allowance
        *current_allowance = *current_allowance - amount;
        
        // Perform the transfer
        let asset = get_metadata();
        let managed_fungible_asset = borrow_global<ManagedFungibleAsset>(object::object_address(&asset));
        let from_wallet = primary_fungible_store::primary_store(from, asset);
        let to_wallet = primary_fungible_store::ensure_primary_store_exists(to, asset);
        let fa = fungible_asset::withdraw_with_ref(&managed_fungible_asset.transfer_ref, from_wallet, amount);
        fungible_asset::deposit_with_ref(&managed_fungible_asset.transfer_ref, to_wallet, fa);
    }

    /// Decrease allowance for a spender
    public entry fun decrease_allowance(
        owner: &signer,
        spender: address,
        amount: u64
    ) acquires Approvals {
        let owner_addr = signer::address_of(owner);
        assert!(exists<Approvals>(owner_addr), EINSUFFICIENT_ALLOWANCE);
        let approvals = borrow_global_mut<Approvals>(owner_addr);
        assert!(table::contains(&approvals.approvals, spender), EINSUFFICIENT_ALLOWANCE);
        let current_allowance = table::borrow_mut(&mut approvals.approvals, spender);
        assert!(*current_allowance >= amount, EINSUFFICIENT_ALLOWANCE);
        *current_allowance = *current_allowance - amount;
    }
}