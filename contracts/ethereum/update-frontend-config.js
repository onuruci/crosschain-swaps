const fs = require('fs');
const path = require('path');

function updateFrontendConfig() {
  try {
    // Read deployment info
    const deploymentInfoPath = path.join(__dirname, 'deployment-info.json');
    const deploymentInfo = JSON.parse(fs.readFileSync(deploymentInfoPath, 'utf8'));
    
    // Read frontend config
    const frontendConfigPath = path.join(__dirname, '../../frontend/src/config/index.ts');
    let frontendConfig = fs.readFileSync(frontendConfigPath, 'utf8');
    
    // Extract contract address
    const contractAddress = deploymentInfo.contracts.AtomicSwap;
    
    // Update the contract address in the frontend config
    const updatedConfig = frontendConfig.replace(
      /contractAddress: process\.env\.REACT_APP_ETHEREUM_CONTRACT_ADDRESS \|\| '[^']*'/,
      `contractAddress: process.env.REACT_APP_ETHEREUM_CONTRACT_ADDRESS || '${contractAddress}'`
    );
    
    // Write back to file
    fs.writeFileSync(frontendConfigPath, updatedConfig);
    
    console.log('✅ Frontend config updated with contract address:', contractAddress);
    console.log('📝 You can now restart your frontend to use the new contract address');
    
  } catch (error) {
    console.error('❌ Failed to update frontend config:', error.message);
  }
}

updateFrontendConfig(); 