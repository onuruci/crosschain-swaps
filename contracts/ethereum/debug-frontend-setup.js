const { ethers } = require('hardhat');

async function main() {
  console.log('🔍 Debugging frontend setup exactly...\n');

  const contractAddress = '0xdc64a140aa3e981100a9beca4e685f962f0cf6c9';
  
  // Get the ABI from the contract factory (like frontend does)
  const AtomicSwap = await ethers.getContractFactory('AtomicSwap');
  const contractABI = AtomicSwap.interface.fragments;
  
  console.log('✅ ABI fragments count:', contractABI.length);
  console.log('✅ hashlockUsed function found:', contractABI.some(f => f.name === 'hashlockUsed'));

  // Test 1: Frontend exact setup
  console.log('\n🧪 Test 1: Frontend exact setup');
  try {
    // Create provider exactly like frontend
    const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
    
    // Get signer like frontend (using first account)
    const signer = await provider.getSigner(0);
    console.log('✅ Signer address:', await signer.getAddress());
    
    // Create contract exactly like frontend
    const frontendContract = new ethers.Contract(
      contractAddress,
      contractABI,
      signer
    );
    
    console.log('✅ Contract created with frontend ABI');
    
    // Test hashlockUsed
    const testHashlock = '0x1234567890123456789012345678901234567890123456789012345678901234';
    const result = await frontendContract.hashlockUsed(testHashlock);
    console.log('✅ Frontend exact result:', result);
    
  } catch (error) {
    console.error('❌ Frontend exact test failed:', error.message);
    console.error('Error details:', error);
  }

  // Test 2: Compare with working approach
  console.log('\n🧪 Test 2: Working approach comparison');
  try {
    const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
    const signer = await provider.getSigner(0);
    
    // Use the working approach from our previous test
    const workingContract = new ethers.Contract(
      contractAddress,
      contract.interface.fragments, // Use contract.interface.fragments instead of contractABI
      signer
    );
    
    const testHashlock = '0x1234567890123456789012345678901234567890123456789012345678901234';
    const result = await workingContract.hashlockUsed(testHashlock);
    console.log('✅ Working approach result:', result);
    
  } catch (error) {
    console.error('❌ Working approach failed:', error.message);
  }

  // Test 3: Check ABI differences
  console.log('\n🧪 Test 3: ABI comparison');
  try {
    console.log('Frontend ABI hashlockUsed:');
    const frontendHashlockUsed = contractABI.find(f => f.name === 'hashlockUsed');
    console.log(JSON.stringify(frontendHashlockUsed, null, 2));
    
    console.log('\nWorking ABI hashlockUsed:');
    const workingHashlockUsed = contract.interface.fragments.find(f => f.name === 'hashlockUsed');
    console.log(JSON.stringify(workingHashlockUsed, null, 2));
    
    console.log('\nABIs are identical:', JSON.stringify(frontendHashlockUsed) === JSON.stringify(workingHashlockUsed));
    
  } catch (error) {
    console.error('❌ ABI comparison failed:', error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }); 