const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

const artifactPath = path.join(__dirname, "../artifacts/contracts/AtomicSwap.sol/AtomicSwap.json");
const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
const abi = artifact.abi;

const PRIVATE_KEY = "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6";
const RPC_URL = "http://127.0.0.1:8545/";
const CONTRACT_ADDRESS = "0xe7f1725e7734ce288f8367e1bb143e90bb3f0512";

const txHash = "0x8d2c7a41d722d036fdcc1256ad2a4debb27f56b271dbf493a148f3ceed0e401b"

function formatValue(value, type) {
    if (typeof value === 'bigint' || (value && value._isBigNumber)) {
        return value.toString();
    }
    if (type === 'address') {
        return value;
    }
    if (type.includes('uint') && value) {
        return value.toString();
    }
    return value;
}

async function main() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    const contractInterface = new ethers.Interface(abi);

    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt) {
        throw new Error("Transaction not found or not mined yet");
    }

    receipt.logs.forEach((log, index) => {
        try {
            // Filter by contract address if provided
            if (CONTRACT_ADDRESS && log.address.toLowerCase() !== CONTRACT_ADDRESS.toLowerCase()) {
                return;
            }

            const parsedLog = contractInterface.parseLog(log);

            console.log(parsedLog)
            
            console.log(`\n🎯 Event ${index + 1}: ${parsedLog.name}`);
            console.log(`Contract: ${log.address}`);
            console.log(`Log Index: ${log.logIndex}`);
            
            // Print all event arguments
            const args = {};
            parsedLog.fragment.inputs.forEach((input, i) => {
                const value = parsedLog.args[i];
                args[input.name] = formatValue(value, input.type);
                console.log(`${input.name} (${input.type}):`, args[input.name]);
            });
        } catch (parseError) {
            // Log doesn't match this ABI - might be from different contract
            console.log(`Log ${index + 1}: Cannot parse with provided ABI`);
        }
    });
}

main()