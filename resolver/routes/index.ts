import express from "express"
var router = express.Router();
import bitcoinService from "../services/BitcoinService";
import ethereumService from "../services/EthereumService";
import aptosService from "../services/AptosService";
import { getHash } from "../src/utils";

/* GET home page. */
router.get('/', function(req: any, res: any, next: any) {
  res.json({
    "success": true,
  });
});

router.get('/bitcoin-pubkey', function(req: any, res: any, next: any) {
  res.json({
    "success": true,
    "pubkey": bitcoinService.publicKey().toString("hex")
  });
});


router.post('/swap/bitcoin-ethereum', async function(req: any, res: any, next: any) {
  // Maker wants to make a swap from bitcoin to ethereum
  // and locked a value alongside it, relayer shared this information
  // if resolver finds it profitable and builds a path to make profit from this 
  // swap, takes action and locks value in ethereum chain and waits for 
  // maker to share the secret, returns the address of the locked funds

  const { hashlock, bitcoinTxid, bitcoinVout, bitcoinAmount, bitcoinLockTime, bitcoinSenderPubKey, ethereumAmount, ethereumTimelock, ethereumRecipient } = req.body;

  try {
    console.log('🔄 Creating Bitcoin to Ethereum swap:', {
      bitcoinTxid,
      bitcoinVout,
      bitcoinAmount,
      bitcoinLockTime,
      bitcoinSenderPubKey: bitcoinSenderPubKey?.substring(0, 16) + '...',
      ethereumAmount,
      ethereumTimelock,
      ethereumRecipient,
      hashlock
    });

    console.log('🔐 Generated hashlock:', hashlock.substring(0, 16) + '...');

    // Get current epoch time from Ethereum provider and calculate timelock
    console.log('📊 Getting current Ethereum epoch time...');
    const currentEpoch = await ethereumService.getCurrentEpoch();
    const ethereumTimelockEpoch = currentEpoch + ethereumTimelock;
    
    console.log(`   Current epoch: ${currentEpoch}`);
    console.log(`   Timelock seconds: ${ethereumTimelock}`);
    console.log(`   Calculated timelock epoch: ${ethereumTimelockEpoch}`);

    // Create the Ethereum swap with the generated hashlock
    const ethereumTxHash = await ethereumService.initiateSwap(
      ethereumRecipient, // recipient (user's Ethereum address)
      hashlock,
      ethereumTimelock,
      ethereumAmount
    );

    console.log('✅ Ethereum swap created:', ethereumTxHash);

    res.json({
      "success": true,
      "ethereumTxHash": ethereumTxHash,
      "ethereumAddress": ethereumService.getAddress(),
      "hashlock": hashlock,
      "ethereumTimelock": ethereumTimelock,
      "ethereumAmount": ethereumAmount,
      "bitcoinTxid": bitcoinTxid,
      "bitcoinVout": bitcoinVout,
      "bitcoinAmount": bitcoinAmount,
      "bitcoinLockTime": bitcoinLockTime,
      "bitcoinSenderPubKey": bitcoinSenderPubKey,
      "message": "Ethereum swap created. Complete the Bitcoin swap to proceed."
    });

  } catch (error) {
    console.error('❌ Error creating Bitcoin to Ethereum swap:', error);
    res.status(500).json({
      "success": false,
      "error": error instanceof Error ? error.message : 'Unknown error'
    });
  }
})

router.post('/swap/ethereum-bitcoin', async function(req: any, res: any, next: any) {
  // Bitcoin is the destination chain, resolver generates a new hashlocked
  // contract with maker's pubkey as the receiver

  const valuesats = 100000
  const timelockbtc = 15
  //const { valueEth, hash, recepientPubKey, lockTime } = req.body;

  const { txHash, recepientPubKey, bitcoinAmount } = req.body;

  console.log("VALUES")
  console.log(txHash)
  console.log(recepientPubKey)
  console.log(bitcoinAmount)

  const {hashlock, initiator, receipient, token, amount, timelock} = await ethereumService.parseTx(txHash)

  const {txid, vout, address, lockerPubKey, hash} = await bitcoinService.newHashlockedContractDst(recepientPubKey, hashlock, timelockbtc, parseInt(bitcoinAmount))

  res.json({
    "success": true,
    "txid": txid,
    "vout": vout,
    "address": address,
    "locketPubKey": lockerPubKey.toString(),
    "timelock": timelockbtc,
    "amount": amount,
    "hash": hash
  });
})


router.post('/complete/bitcoin', async function(req: any, res: any, next: any) {
  // this endpoint is triggered when a maker shares the secret
  // of hashlocked contract that is locked to resolver in bitcoin
  // network, resolver uses the secret and redeems the locked bitcoin 

  const { txid, vout, secret, lockTime, amount, senderPubKey } = req.body;
  
  await bitcoinService.completeSwap(txid, parseInt(vout), secret, parseInt(lockTime), parseInt(amount), senderPubKey)

  res.json({
    "success": true,
    "address": ""
  });
})


router.post('/complete/ethereum', function(req: any, res: any, next: any) {
  // completeSwapEthereum(value, hash, receipent)

  res.json({
    "success": true,
    "address": ""
  });
})

// New swap endpoints for creating counter swaps
router.post('/swap/ethereum', async function(req: any, res: any, next: any) {
  // Create counter swap on Ethereum (for Aptos to Ethereum flow)
  // Parameters: signature, swapData, recipientAddress, amount
  console.log("REQ BODY")
  const { signature, swapData, recipientAddress, amount } = req.body;

  console.log("SIGNATURE")
  console.log(signature)
  console.log("SWAP DATA")
  console.log(swapData)

  try {
    // Use signature for Aptos meta transaction
    const aptosResult = await aptosService.initiateSwapSignature(
      swapData,
      signature
    );

    // Convert hashlock array to hex string
    const hashlockHex = '0x' + Array.from(swapData.hashlock).map((b: unknown) => (b as number).toString(16).padStart(2, '0')).join('');
    console.log("Hashlock hex:", hashlockHex);
    
    // Use regular initiateSwap for Ethereum
    const ethereumResult = await ethereumService.initiateSwap(
      hashlockHex,
      swapData.timelock,
      recipientAddress,
      amount
    );

    console.log("APTOS RESULT")
    console.log(aptosResult)
    console.log("ETHEREUM RESULT")
    console.log(ethereumResult)

    res.json({
      "success": true,
      "aptosTxHash": aptosResult,
      "ethereumTxHash": ethereumResult,
      "address": ethereumService.getAddress()
    });

  } catch (error) {
    console.error('❌ Error creating Ethereum counter swap:', error);
    res.status(500).json({
      "success": false,
      "error": error instanceof Error ? error.message : 'Unknown error'
    });
  }
});




router.post('/swap/aptos', async function(req: any, res: any, next: any) {
  // Create counter swap on Aptos
  // Parameters: hashlock, maker address, timelock
  console.log("REQ BODY")
  const { signature, swapData, aptosRecipientAddress, aptosAmount } = req.body;

  console.log("SIGNATURE")
  console.log(signature)
  console.log(swapData)

  swapData.amount = BigInt(swapData.amount)
  try {
    const ethereumResult = await ethereumService.initiateSwapSignature(
      swapData,
      signature,
    );

    const aptosResult = await aptosService.initiateSwap(
      aptosRecipientAddress,
      swapData.hashlock,
      swapData.timelock,
      aptosAmount
    );

    console.log("ETHEREUM RESULT")
    console.log(ethereumResult)
    console.log("APTOS RESULT")
    console.log(aptosResult)


    res.json({
      "success": true,
      "ethereumTxHash": ethereumResult,
      "aptosTxHash": aptosResult
    });

  } catch (error) {
    console.error('❌ Error creating Aptos counter swap:', error);
    res.status(500).json({
      "success": false,
      "error": error instanceof Error ? error.message : 'Unknown error'
    });
  }
});


// Complete swap on both chains using the secret
router.post('/complete/ethereum-and-aptos', async function(req: any, res: any, next: any) {
  const { hashlock, secret } = req.body;

  try {
    console.log('🔄 Completing swaps on both chains:', {
      hashlock: hashlock.substring(0, 16) + '...',
      secret: secret.substring(0, 16) + '...'
    });

    // Complete swap on Ethereum
    console.log('🔗 Completing Ethereum swap...');
    const ethereumResult = await ethereumService.completeSwap(hashlock, secret);
    
    // Complete swap on Aptos
    console.log('🔗 Completing Aptos swap...');
    const aptosResult = await aptosService.completeSwap('', hashlock, secret);

    res.json({
      "success": true,
      "ethereum": {
        "txHash": ethereumResult,
        "success": true
      },
      "aptos": {
        "txHash": aptosResult.hash,
        "success": true
      }
    });
  } catch (error) {
    console.error('❌ Error completing swaps:', error);
    res.status(500).json({
      "success": false,
      "error": error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Complete Bitcoin to Ethereum swap using the secret
router.post('/complete/bitcoin-ethereum', async function(req: any, res: any, next: any) {
  const { 
    bitcoinTxid, 
    bitcoinVout, 
    bitcoinAmount, 
    bitcoinLockTime, 
    bitcoinSenderPubKey, 
    hashlock, 
    secret 
  } = req.body;

  try {
    console.log('🔄 Completing Bitcoin to Ethereum swap:', {
      bitcoinTxid,
      bitcoinVout,
      hashlock: hashlock.substring(0, 16) + '...',
      secret: secret.substring(0, 16) + '...'
    });

    // Complete the Bitcoin swap first (redeem the locked Bitcoin)
    console.log('🔗 Completing Bitcoin swap...');
    await bitcoinService.completeSwap(
      bitcoinTxid,
      parseInt(bitcoinVout),
      secret,
      parseInt(bitcoinLockTime),
      parseInt(bitcoinAmount),
      bitcoinSenderPubKey
    );

    // Complete the Ethereum swap (redeem the locked Ethereum)
    console.log('🔗 Completing Ethereum swap...');
    const ethereumResult = await ethereumService.completeSwap(hashlock, secret);

    res.json({
      "success": true,
      "bitcoin": {
        "success": true,
        "message": "Bitcoin swap completed successfully"
      },
      "ethereum": {
        "txHash": ethereumResult,
        "success": true
      },
      "message": "Both Bitcoin and Ethereum swaps completed successfully"
    });

  } catch (error) {
    console.error('❌ Error completing Bitcoin to Ethereum swap:', error);
    res.status(500).json({
      "success": false,
      "error": error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router
