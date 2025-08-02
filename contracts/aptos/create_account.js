const { AptosAccount, AptosClient, FaucetClient } = require("aptos");

async function createNewAccount() {
  try {
    // Create a new account
    const account = new AptosAccount();
    
    console.log("🔑 New Aptos Account Created:");
    console.log("Address:", account.address().toString());
    console.log("Private Key:", account.toPrivateKeyObject().privateKeyHex);
    console.log("Public Key:", account.publicKey().toString());
    
    // Initialize the Aptos client
    const client = new AptosClient("https://fullnode.testnet.aptoslabs.com/v1");
    
    // Initialize the faucet client
    const faucetClient = new FaucetClient("https://fullnode.testnet.aptoslabs.com", "https://faucet.testnet.aptoslabs.com");
    
    console.log("\n💰 Funding account with testnet APT...");
    
    // Fund the account with testnet APT
    await faucetClient.fundAccount(account.address(), 100_000_000); // 100 APT
    
    console.log("✅ Account funded successfully!");
    
    // Check the account balance
    const balance = await client.getAccountBalance(account.address());
    console.log("Current Balance:", balance.amount, "octas");
    
    console.log("\n📋 Next Steps:");
    console.log("1. Update your Move.toml with the new address");
    console.log("2. Update your frontend config with the new address");
    console.log("3. Deploy your contracts to the new address");
    
    return {
      address: account.address().toString(),
      privateKey: account.toPrivateKeyObject().privateKeyHex,
      publicKey: account.publicKey().toString()
    };
    
  } catch (error) {
    console.error("❌ Error creating account:", error);
    throw error;
  }
}

// Run the function
createNewAccount()
  .then((accountInfo) => {
    console.log("\n🎉 Account creation completed successfully!");
    console.log("Save this information securely:");
    console.log(JSON.stringify(accountInfo, null, 2));
  })
  .catch((error) => {
    console.error("Failed to create account:", error);
    process.exit(1);
  }); 