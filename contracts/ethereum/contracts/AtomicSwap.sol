// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";


/**
 * @title AtomicSwap
 * @dev Implements atomic swap functionality with hashlock and timelock
 * This is the core contract for cross-chain swaps between Ethereum and Aptos
 * Supports both ETH and ERC-20 tokens
 */
contract AtomicSwap is ReentrancyGuard, Ownable {
    constructor() Ownable(msg.sender) {
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes("AtomicSwap")),
                keccak256(bytes("1")),
                block.chainid,
                address(this)
            )
        );
    }
    // EIP-712 Domain Separator
    bytes32 public immutable DOMAIN_SEPARATOR;
    
    // EIP-712 TypeHashes
    bytes32 public constant INITIATE_SWAP_TYPEHASH = keccak256(
        "InitiateSwap(address initiator,bytes32 hashlock,uint256 timelock,address recipient,address token,uint256 amount,uint256 nonce,uint256 deadline)"
    );

    using SafeERC20 for IERC20;
    using ECDSA for bytes32;

    // Nonces for meta-transactions (prevent replay attacks)
    mapping(address => uint256) public nonces;
    
    // Mapping to track used meta-transaction signatures
    mapping(bytes32 => bool) public usedMetaSignatures;
    
    // Events
    event SwapInitiated(
        bytes32 indexed hashlock,
        address indexed initiator,
        address indexed recipient,
        address token,
        uint256 amount,
        uint256 timelock
    );
    
    event SwapCompleted(
        bytes32 indexed hashlock,
        address indexed recipient,
        address token,
        uint256 amount,
        bytes32 secret
    );
    
    event SwapRefunded(
        bytes32 indexed hashlock,
        address indexed initiator,
        address token,
        uint256 amount
    );
    
    // Struct to store swap information
    struct Swap {
        bytes32 hashlock;        // Hash of the secret
        uint256 timelock;        // Expiration timestamp
        address initiator;       // Address that initiated the swap
        address recipient;       // Address that will receive the tokens
        address token;           // Token address (address(0) for ETH)
        uint256 amount;          // Amount of tokens to swap
        bool completed;          // Whether the swap has been completed
        bool refunded;           // Whether the swap has been refunded
    }

    struct InitiateSwapMeta {
        address initiator;       // The actual user initiating the swap
        bytes32 hashlock;        // Hash of the secret
        uint256 timelock;        // Expiration timestamp
        address recipient;       // Address that will receive the tokens
        address token;           // Token address (address(0) for ETH)
        uint256 amount;          // Amount of tokens to swap
        uint256 nonce;           // Nonce for replay protection
        uint256 deadline;        // Signature expiration time
    }
    
    // Mapping from hashlock to swap details
    mapping(bytes32 => Swap) public swaps;
    
    // Mapping to track if a hashlock has been used
    mapping(bytes32 => bool) public hashlockUsed;
    
    // Minimum timelock duration (1 hour)
    uint256 public constant MIN_TIMELOCK = 1 hours;
    
    // Maximum timelock duration (7 days)
    uint256 public constant MAX_TIMELOCK = 7 days;
    
    // Errors
    error HashlockAlreadyUsed();
    error SwapNotFound();
    error SwapAlreadyCompleted();
    error SwapAlreadyRefunded();
    error TimelockNotExpired();
    error TimelockExpired();
    error InvalidSecret();
    error InvalidTimelock();
    error InvalidRecipient();
    error InvalidAmount();
    error InsufficientBalance();
    error TransferFailed();
    error InvalidSignature();
    error SignatureExpired();
    error SignatureAlreadyUsed();
    error InvalidNonce();
    
    /**
     * @dev Initiates a new atomic swap with ETH
     * @param hashlock The hash of the secret only (keccak256(secret))
     * @param timelock The expiration timestamp
     * @param recipient The address that will receive the tokens
     * @param amount The amount of ETH to swap
     */
    function initiateSwap(
        bytes32 hashlock,
        uint256 timelock,
        address recipient,
        uint256 amount
    ) external payable nonReentrant {
        _initiateSwap(hashlock, timelock, recipient, address(0), amount);
    }


     /**
     * @dev Meta-transaction version of initiateSwap - allows gasless swap initiation
     * @param metaData The swap initiation data signed by the user
     * @param signature The user's signature
     */
    function initiateSwapMeta(
        InitiateSwapMeta calldata metaData,
        bytes calldata signature
    ) external payable nonReentrant {
        // Verify deadline
        if (block.timestamp > metaData.deadline) {
            revert SignatureExpired();
        }
        
        // Verify nonce
        // if (nonces[metaData.initiator] != metaData.nonce) {
        //     revert InvalidNonce();
        // }
        
        // Create hash for signature verification
        bytes32 hash = keccak256(
            abi.encodePacked(
                "\x19\x01",
                DOMAIN_SEPARATOR,
                keccak256(
                    abi.encode(
                        INITIATE_SWAP_TYPEHASH,
                        metaData.initiator,
                        metaData.hashlock,
                        metaData.timelock,
                        metaData.recipient,
                        metaData.token,
                        metaData.amount,
                        metaData.nonce,
                        metaData.deadline
                    )
                )
            )
        );
        
        if (usedMetaSignatures[hash]) {
            revert SignatureAlreadyUsed();
        }
        
        // Verify signature
        address signer = hash.recover(signature);
        if (signer != metaData.initiator) {
            revert InvalidSignature();
        }
        
        // Mark signature as used and increment nonce
        usedMetaSignatures[hash] = true;
        nonces[metaData.initiator]++;
        
        // Execute the swap initiation
        _initiateSwap(metaData.hashlock, metaData.timelock, metaData.recipient, metaData.token, metaData.amount);
        
        if (metaData.token != address(0)) {
            IERC20(metaData.token).transferFrom(metaData.initiator, metaData.recipient, metaData.amount);
        }
    }

    function _initiateSwapHelper(
        bytes32 hashlock,
        uint256 timelock,
        address recipient,
        uint256 amount
    ) internal nonReentrant {
        _initiateSwap(hashlock, timelock, recipient, address(0), amount);
    }
    
    /**
     * @dev Initiates a new atomic swap with ERC-20 tokens
     * @param hashlock The hash of the secret only (keccak256(secret))
     * @param timelock The expiration timestamp
     * @param recipient The address that will receive the tokens
     * @param token The ERC-20 token address
     * @param amount The amount of tokens to swap
     */
    function initiateTokenSwap(
        bytes32 hashlock,
        uint256 timelock,
        address recipient,
        address token,
        uint256 amount
    ) external nonReentrant {
        _initiateSwap(hashlock, timelock, recipient, token, amount);
        
        // Transfer tokens from initiator to contract
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
    }
    
    /**
     * @dev Internal function to initiate a swap
     * @param hashlock The hash of the secret
     * @param timelock The expiration timestamp
     * @param recipient The address that will receive the tokens
     * @param token The token address (address(0) for ETH)
     * @param amount The amount of tokens to swap
     */
    function _initiateSwap(
        bytes32 hashlock,
        uint256 timelock,
        address recipient,
        address token,
        uint256 amount
    ) internal {
        if (hashlockUsed[hashlock]) {
            revert HashlockAlreadyUsed();
        }
        
        if (timelock < block.timestamp + MIN_TIMELOCK || timelock > block.timestamp + MAX_TIMELOCK) {
            revert InvalidTimelock();
        }
        
        if (recipient == address(0)) {
            revert InvalidRecipient();
        }
        
        if (amount == 0) {
            revert InvalidAmount();
        }
        
        // For ETH swaps, verify the correct amount was sent
        if (token == address(0)) {
            if (msg.value != amount) {
                revert InvalidAmount();
            }
        }
        
        swaps[hashlock] = Swap({
            hashlock: hashlock,
            timelock: timelock,
            initiator: msg.sender,
            recipient: recipient,
            token: token,
            amount: amount,
            completed: false,
            refunded: false
        });
        
        hashlockUsed[hashlock] = true;
        
        emit SwapInitiated(hashlock, msg.sender, recipient, token, amount, timelock);
    }
    
    /**
     * @dev Completes a swap by providing the secret
     * @param hashlock The hash of the secret
     * @param secret The secret that generates the hashlock
     */
    function completeSwap(bytes32 hashlock, bytes32 secret, bool useSha256) external nonReentrant {
        Swap storage swap = swaps[hashlock];
        
        if (swap.initiator == address(0)) {
            revert SwapNotFound();
        }
        
        if (swap.completed) {
            revert SwapAlreadyCompleted();
        }
        
        if (swap.refunded) {
            revert SwapAlreadyRefunded();
        }
        
        if (block.timestamp >= swap.timelock) {
            revert TimelockExpired();
        }
        
        bytes32 computedHash;
        if (useSha256) {
            computedHash = sha256(abi.encodePacked(secret));
        } else {
            computedHash = keccak256(abi.encodePacked(secret));
        }
        
        if (computedHash != hashlock) {
            revert InvalidSecret();
        }
        
        // No recipient check - anyone with the secret can complete the swap
        
        swap.completed = true;
        
        // Transfer tokens to recipient
            // ETH transfer
        (bool success, ) = swap.recipient.call{value: swap.amount}("");
        if (!success) {
            revert TransferFailed();
        }
        
        
        emit SwapCompleted(hashlock, swap.recipient, swap.token, swap.amount, secret);
    }

    /**
     * @dev Completes a swap by the initiator (for cross-chain atomic swaps)
     * This allows the initiator to complete their own swap when they are also the recipient
     * @param hashlock The hash of the secret
     * @param secret The secret that generates the hashlock
     */
    function completeSwapAsInitiator(bytes32 hashlock, bytes32 secret) external nonReentrant {
        Swap storage swap = swaps[hashlock];
        
        if (swap.initiator == address(0)) {
            revert SwapNotFound();
        }
        
        if (swap.completed) {
            revert SwapAlreadyCompleted();
        }
        
        if (swap.refunded) {
            revert SwapAlreadyRefunded();
        }
        
        if (block.timestamp >= swap.timelock) {
            revert TimelockExpired();
        }
        
        // Verify the secret matches the hashlock (recipient-agnostic)
        if (keccak256(abi.encodePacked(secret)) != hashlock) {
            revert InvalidSecret();
        }
        
        // Only the initiator can complete their own swap
        if (msg.sender != swap.initiator) {
            revert InvalidRecipient();
        }
        
        // For cross-chain swaps, the initiator should also be the recipient
        if (msg.sender != swap.recipient) {
            revert InvalidRecipient();
        }
        
        swap.completed = true;
        
        // Transfer tokens to recipient (which is the initiator)
        if (swap.token == address(0)) {
            // ETH transfer
            (bool success, ) = swap.recipient.call{value: swap.amount}("");
            if (!success) {
                revert TransferFailed();
            }
        } else {
            // ERC-20 transfer
            IERC20(swap.token).safeTransfer(swap.recipient, swap.amount);
        }
        
        emit SwapCompleted(hashlock, swap.recipient, swap.token, swap.amount, secret);
    }
    
    /**
     * @dev Refunds a swap after the timelock expires
     * @param hashlock The hash of the secret
     */
    function refundSwap(bytes32 hashlock) external nonReentrant {
        Swap storage swap = swaps[hashlock];
        
        if (swap.initiator == address(0)) {
            revert SwapNotFound();
        }
        
        if (swap.completed) {
            revert SwapAlreadyCompleted();
        }
        
        if (swap.refunded) {
            revert SwapAlreadyRefunded();
        }
        
        if (block.timestamp < swap.timelock) {
            revert TimelockNotExpired();
        }
        
        // Only the initiator can refund
        if (msg.sender != swap.initiator) {
            revert InvalidRecipient();
        }
        
        swap.refunded = true;
        
        // Transfer tokens back to initiator
        if (swap.token == address(0)) {
            // ETH transfer
            (bool success, ) = swap.initiator.call{value: swap.amount}("");
            if (!success) {
                revert TransferFailed();
            }
        } else {
            // ERC-20 transfer
            IERC20(swap.token).safeTransfer(swap.initiator, swap.amount);
        }
        
        emit SwapRefunded(hashlock, swap.initiator, swap.token, swap.amount);
    }
    
    /**
     * @dev Checks if a swap can be completed
     * @param hashlock The hash of the secret
     * @return bool True if the swap can be completed
     */
    function canComplete(bytes32 hashlock) external view returns (bool) {
        Swap storage swap = swaps[hashlock];
        
        if (swap.initiator == address(0) || swap.completed || swap.refunded) {
            return false;
        }
        
        return block.timestamp < swap.timelock;
    }
    
    /**
     * @dev Checks if a swap can be refunded
     * @param hashlock The hash of the secret
     * @return bool True if the swap can be refunded
     */
    function canRefund(bytes32 hashlock) external view returns (bool) {
        Swap storage swap = swaps[hashlock];
        
        if (swap.initiator == address(0) || swap.completed || swap.refunded) {
            return false;
        }
        
        return block.timestamp >= swap.timelock;
    }
    
    /**
     * @dev Gets the details of a swap
     * @param hashlock The hash of the secret
     * @return initiator The address that initiated the swap
     * @return recipient The address that will receive the tokens
     * @return token The token address
     * @return amount The amount of tokens
     * @return timelock The expiration timestamp
     * @return completed Whether the swap has been completed
     * @return refunded Whether the swap has been refunded
     */
    function getSwap(bytes32 hashlock) external view returns (
        address initiator,
        address recipient,
        address token,
        uint256 amount,
        uint256 timelock,
        bool completed,
        bool refunded
    ) {
        Swap storage swap = swaps[hashlock];
        return (
            swap.initiator,
            swap.recipient,
            swap.token,
            swap.amount,
            swap.timelock,
            swap.completed,
            swap.refunded
        );
    }
    
    /**
     * @dev Allows the owner to withdraw any stuck tokens (emergency only)
     * @param token The token address to withdraw
     * @param amount The amount to withdraw
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        if (token == address(0)) {
            (bool success, ) = owner().call{value: amount}("");
            require(success, "ETH transfer failed");
        } else {
            IERC20(token).safeTransfer(owner(), amount);
        }
    }
    
    /**
     * @dev Allows the contract to receive ETH
     */
    receive() external payable {}
} 