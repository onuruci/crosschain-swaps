const { ethers } = require("hardhat");

async function main() {
  console.log("Starting deployment...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Deploy AtomicSwap contract
  console.log("\nDeploying AtomicSwap...");
  const AtomicSwap = await ethers.getContractFactory("AtomicSwap");
  const atomicSwap = await AtomicSwap.deploy();
  await atomicSwap.waitForDeployment();
  console.log("AtomicSwap deployed to:", await atomicSwap.getAddress());

   // Deploy Weth contract
   console.log("\nDeploying Weth...");
   const Weth = await ethers.getContractFactory("WETH");
   const weth = await Weth.deploy();
   await weth.waitForDeployment();
   console.log("Weth deployed to:", await weth.getAddress());

  // Log deployment summary
  console.log("\n=== Deployment Summary ===");
  console.log("AtomicSwap Contract:", await atomicSwap.getAddress());
  console.log("Weth Contract:", await weth.getAddress());
  console.log("Deployer Address:", deployer.address);

  // Save deployment info
  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).name,
    deployer: deployer.address,
    contracts: {
      AtomicSwap: await atomicSwap.getAddress(),
      Weth: await weth.getAddress()
    },
    timestamp: new Date().toISOString()
  };

  console.log("\nDeployment info:", JSON.stringify(deploymentInfo, null, 2));
  
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 