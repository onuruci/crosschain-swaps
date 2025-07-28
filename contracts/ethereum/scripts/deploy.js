const { ethers } = require("hardhat");

async function main() {
  console.log("Starting deployment...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Deploy MockERC20 token first
  console.log("\nDeploying MockERC20...");
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const mockToken = await MockERC20.deploy("Mock Token", "MTK");
  await mockToken.waitForDeployment();
  console.log("MockERC20 deployed to:", await mockToken.getAddress());

  // Deploy AtomicSwap contract
  console.log("\nDeploying AtomicSwap...");
  const AtomicSwap = await ethers.getContractFactory("AtomicSwap");
  const atomicSwap = await AtomicSwap.deploy();
  await atomicSwap.waitForDeployment();
  console.log("AtomicSwap deployed to:", await atomicSwap.getAddress());

  // Mint some tokens to the deployer for testing
  console.log("\nMinting tokens to deployer...");
  const mintAmount = ethers.parseEther("1000000"); // 1 million tokens
  await mockToken.mint(deployer.address, mintAmount);
  console.log(`Minted ${ethers.formatEther(mintAmount)} tokens to deployer`);

  // Log deployment summary
  console.log("\n=== Deployment Summary ===");
  console.log("MockERC20 Token:", await mockToken.getAddress());
  console.log("AtomicSwap Contract:", await atomicSwap.getAddress());
  console.log("Deployer Address:", deployer.address);
  console.log("Deployer Token Balance:", ethers.formatEther(await mockToken.balanceOf(deployer.address)));

  // Save deployment info
  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).name,
    deployer: deployer.address,
    contracts: {
      MockERC20: await mockToken.getAddress(),
      AtomicSwap: await atomicSwap.getAddress()
    },
    timestamp: new Date().toISOString()
  };

  console.log("\nDeployment info:", JSON.stringify(deploymentInfo, null, 2));
  
  // Save deployment info to file
  const fs = require('fs');
  const path = require('path');
  const deploymentInfoPath = path.join(__dirname, '../deployment-info.json');
  fs.writeFileSync(deploymentInfoPath, JSON.stringify(deploymentInfo, null, 2));
  
  // Update frontend config
  console.log("\n🔄 Updating frontend configuration...");
  try {
    const { execSync } = require('child_process');
    execSync('node update-frontend-config.js', { cwd: __dirname + '/..' });
  } catch (error) {
    console.log("⚠️ Could not auto-update frontend config. Please run: node update-frontend-config.js");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 