import { ethers } from 'ethers';

// Your custom error definitions
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

// Create Interface only with these errors
const iface = new ethers.utils.Interface(
  errors.map(e => `error ${e}`).join('\n')
);

/**
 * Logs decoded error from revert data
 * @param {string} errorData - Revert data hex string (e.g. error.data)
 */
function logDecodedError(errorData) {
  if (!errorData || errorData === '0x') {
    console.log('No revert data to decode.');
    return;
  }

  try {
    const decoded = iface.parseError(errorData);
    console.log(`Decoded Error: ${decoded.name}`, decoded.args);
  } catch {
    console.log('Failed to decode error data:', errorData);
  }
}

logDecodedError()
