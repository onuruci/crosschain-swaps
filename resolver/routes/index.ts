import express from "express"
var router = express.Router();
import bitcoinService from "../services/BitcoinService";

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

  const { valueEth, hash, recipient, lockTime } = req.body;

  const valuesats = 100000
  await bitcoinService.newHashlockedContractDst(recipient, hash, lockTime, valuesats)

  res.json({
    "success": true,
    "address": ""
  });
})


router.post('/complete/bitcoin', async function(req: any, res: any, next: any) {
  // this endpoint is triggered when a maker shares the secret
  // of hashlocked contract that is locked to resolver in bitcoin
  // network, resolver uses the secret and redeems the locked bitcoin 

  const { txid, vout, secret, lockTime, amount } = req.body;
  await bitcoinService.completeSwap(txid, parseInt(vout), secret, parseInt(lockTime), parseInt(amount))

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


export default router
