const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Logging Smart Contract Error Codes\n");
  console.log("=" * 50);
  
  const errors = [
    "HashlockAlreadyUsed()",
    "SwapNotFound()",
    "SwapAlreadyCompleted()",
    "SwapAlreadyRefunded()",
    "TimelockNotExpired()",
    "TimelockExpired()",
    "InvalidSecret()",
    "InvalidTimelock()",
    "InvalidRecipient()",
    "InvalidAmount()",
    "InsufficientBalance()",
    "TransferFailed()",
    "InvalidSignature()",
    "SignatureExpired()",
    "SignatureAlreadyUsed()",
    "InvalidNonce()",
  ];

  // Log each error with its index
  errors.forEach((error, index) => {
    console.log(`[${index + 1}] ${error}`);
  });

  console.log("\n" + "=" * 50);
  console.log(`📊 Total Error Codes: ${errors.length}`);
  
  // Generate error selectors (useful for debugging)
  console.log("\n🔧 Error Selectors (for debugging):");
  console.log("-" * 40);
  
  errors.forEach((error, index) => {
    const selector = ethers.keccak256(ethers.toUtf8Bytes(error)).slice(0, 10);
    console.log(`${error.padEnd(25)} → ${selector}`);
  });

  // Generate a mapping object for easy reference
  console.log("\n📋 JavaScript Error Mapping:");
  console.log("-" * 40);
  console.log("const ERROR_CODES = {");
  errors.forEach((error, index) => {
    const errorName = error.replace("()", "").toUpperCase();
    console.log(`  ${errorName}: "${error}",`);
  });
  console.log("};");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });