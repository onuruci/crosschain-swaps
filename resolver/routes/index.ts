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

router.post('/swap/bitcoin-ethereum', function(req: any, res: any, next: any) {
  // Maker want to make a swap from bitcoin to ethereum
  // and locked a value alongside it, relayer shared this information
  // if resolver finds it profitable and builds a path to make profit from this 
  // swap, takes action and locks value in ethereum chain and waits for 
  // maker to share the secret, returns the address of the locked funds

  // createHashLockContractEthereum(value, hash, receipent)

  const { value, hash, recipient, lockTime } = req.body;

  res.json({
    "success": true,
    "address": bitcoinService.walletAddress()
  });
})

router.post('/swap/ethereum-bitcoin', async function(req: any, res: any, next: any) {
  // Bitcoin is the destination chain, resolver generates a new hashlocked
  // contract with maker's pubkey as the receiver

  const { valueEth, hash, recepientPubKey, lockTime } = req.body;

  console.log("LOCK TIME: ",lockTime)
  console.log(hash)
  console.log(recepientPubKey)
  console.log(getHash('hello'))

  const valuesats = 100000
  await bitcoinService.newHashlockedContractDst(recepientPubKey, hash, lockTime, valuesats)

  res.json({
    "success": true,
    "address": ""
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
  // Create counter swap on Ethereum
  // Parameters: hashlock, maker address, timelock
  const { hashlock, makerAddress, timelock, amount } = req.body;

  try {
    console.log('🔄 Creating counter swap on Ethereum:', {
      hashlock: hashlock.substring(0, 16) + '...',
      makerAddress,
      timelock,
      amount
    });

    const txHash = await ethereumService.initiateSwap(
      makerAddress,
      hashlock,
      timelock,
      amount
    );

    res.json({
      "success": true,
      "txHash": txHash,
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
  const { hashlock, makerAddress, timelock, amount } = req.body;

  try {
    console.log('🔄 Creating counter swap on Aptos:', {
      hashlock: hashlock.substring(0, 16) + '...',
      makerAddress,
      timelock,
      amount
    });

    const result = await aptosService.initiateSwap(
      makerAddress,
      hashlock,
      timelock,
      amount
    );

    res.json({
      "success": true,
      "txHash": result.hash,
      "address": await aptosService.getAddress()
    });
  } catch (error) {
    console.error('❌ Error creating Aptos counter swap:', error);
    res.status(500).json({
      "success": false,
      "error": error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router
