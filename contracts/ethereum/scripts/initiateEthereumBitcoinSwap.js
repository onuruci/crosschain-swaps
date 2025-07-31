const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
const axşos = require('axios');

const artifactPath = path.join(__dirname, "../artifacts/contracts/AtomicSwap.sol/AtomicSwap.json");
const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
const abi = artifact.abi;

const PRIVATE_KEY = "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6";
const RPC_URL = "http://127.0.0.1:8545/";
const CONTRACT_ADDRESS = "0xe7f1725e7734ce288f8367e1bb143e90bb3f0512";

const crypto = require('crypto');

function getHash(secret) {
    return crypto.createHash('sha256').update(secret).digest();
}


async function main () {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);

    const latestBlock = await provider.getBlock("latest");
    console.log("Current block.timestamp:", latestBlock.timestamp);


    const tx = await contract.initiateSwap(
        "0x"+getHash("helloasd").toString('hex'),
        1753906747,
        "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
        100
    , {
        value: 100
    });
    console.log("Transaction sent:", tx.hash);

    // Wait for confirmation
    const receipt = await tx.wait();
    console.log("Transaction confirmed:", receipt.hash);
}

main()