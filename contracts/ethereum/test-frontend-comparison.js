const { ethers } = require('hardhat');

async function main() {
  console.log('🔍 Testing contract calls to identify frontend vs backend differences...\n');

  // Get the deployed contract
  const contractAddress = '0xdc64a140aa3e981100a9beca4e685f962f0cf6c9';
  const AtomicSwap = await ethers.getContractFactory('AtomicSwap');
  const contract = AtomicSwap.attach(contractAddress);

  console.log('✅ Contract address:', contractAddress);
  console.log('✅ Contract instance created\n');

  // Test 1: Direct contract call (like backend)
  console.log('🧪 Test 1: Direct contract call (backend approach)');
  try {
    const testHashlock = '0x1234567890123456789012345678901234567890123456789012345678901234';
    const result1 = await contract.hashlockUsed(testHashlock);
    console.log('✅ Backend result:', result1);
  } catch (error) {
    console.error('❌ Backend test failed:', error.message);
  }

  // Test 2: Simulate frontend provider setup
  console.log('\n🧪 Test 2: Frontend-style provider setup');
  try {
    // Create provider like frontend (BrowserProvider equivalent)
    const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
    
    // Get signer like frontend
    const signer = await provider.getSigner(0); // Use first account
    
    // Create contract like frontend
    const frontendContract = new ethers.Contract(
      contractAddress,
      contract.interface.fragments,
      signer
    );
    
    const testHashlock = '0x1234567890123456789012345678901234567890123456789012345678901234';
    const result2 = await frontendContract.hashlockUsed(testHashlock);
    console.log('✅ Frontend-style result:', result2);
  } catch (error) {
    console.error('❌ Frontend-style test failed:', error.message);
  }

  // Test 3: Check if contract exists at address
  console.log('\n🧪 Test 3: Check contract existence');
  try {
    const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
    const code = await provider.getCode(contractAddress);
    console.log('✅ Contract code length:', code.length);
    console.log('✅ Contract exists:', code !== '0x');
    
    if (code === '0x') {
      console.error('❌ No contract found at address!');
    }
  } catch (error) {
    console.error('❌ Contract existence check failed:', error.message);
  }

  // Test 4: Check network connection
  console.log('\n🧪 Test 4: Network connection test');
  try {
    const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
    const network = await provider.getNetwork();
    console.log('✅ Network:', network);
    
    const blockNumber = await provider.getBlockNumber();
    console.log('✅ Current block:', blockNumber);
  } catch (error) {
    console.error('❌ Network test failed:', error.message);
  }

  // Test 5: Compare ABI
  console.log('\n🧪 Test 5: ABI comparison');
  try {
    console.log('✅ Backend ABI fragments count:', contract.interface.fragments.length);
    console.log('✅ hashlockUsed function signature:', contract.interface.getFunction('hashlockUsed').format());
  } catch (error) {
    console.error('❌ ABI test failed:', error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }); 