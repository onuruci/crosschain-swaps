const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

const artifactPath = path.join(__dirname, "../artifacts/contracts/Weth.sol/WETH.json");
const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
const abi = artifact.abi;

const PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const RPC_URL = "http://127.0.0.1:8545/";
const CONTRACT_ADDRESS = "0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e";

async function main() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);

    let wethBalance = await contract.balanceOf(wallet.address)
    console.log("Users current WETH balance:    ", wethBalance)

    await contract.deposit({value: ethers.parseEther("100.0")})

    wethBalance = await contract.balanceOf(wallet.address)
    console.log("Users current WETH balance:    ", wethBalance)
}

main()