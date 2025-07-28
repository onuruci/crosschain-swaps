const { ethers } = require("hardhat");

async function main() {
  const contractAddress = "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853"; // The newly deployed address
  
  console.log(`Verifying contract at address: ${contractAddress}`);
  
  try {
    // Get the provider
    const provider = ethers.provider;
    
    // Check if the address has code
    const code = await provider.getCode(contractAddress);
    console.log("Contract code exists:", code !== "0x");
    
    if (code === "0x") {
      console.log("❌ No contract found at this address!");
      return;
    }
    
    // Try to create a contract instance with our ABI
    const AtomicSwap = await ethers.getContractFactory("AtomicSwap");
    const contract = AtomicSwap.attach(contractAddress);
    
    console.log("✅ Contract found! Testing functions...");
    
    // Test basic functions
    try {
      const owner = await contract.owner();
      console.log("✅ Owner:", owner);
    } catch (error) {
      console.log("❌ Owner function failed:", error.message);
    }
    
    try {
      const minTimelock = await contract.MIN_TIMELOCK();
      console.log("✅ MIN_TIMELOCK:", minTimelock.toString());
    } catch (error) {
      console.log("❌ MIN_TIMELOCK function failed:", error.message);
    }
    
    try {
      const maxTimelock = await contract.MAX_TIMELOCK();
      console.log("✅ MAX_TIMELOCK:", maxTimelock.toString());
    } catch (error) {
      console.log("❌ MAX_TIMELOCK function failed:", error.message);
    }
    
    // Test hashlockUsed with a dummy hashlock
    try {
      const dummyHashlock = "0x1234567890123456789012345678901234567890123456789012345678901234";
      const hashlockUsed = await contract.hashlockUsed(dummyHashlock);
      console.log("✅ hashlockUsed function works:", hashlockUsed);
    } catch (error) {
      console.log("❌ hashlockUsed function failed:", error.message);
      console.log("Error details:", error);
    }
    
  } catch (error) {
    console.error("❌ Error verifying contract:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 