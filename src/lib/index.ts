// Services
export { getRepoInfo, validateGitHubUsername } from './services/api';
export { processCommand } from './services/commands';
export { parseCommand } from './services/parser';
export { twitterClient } from './services/twitter';
export { generateEmbedCode } from './services/embed';

// NEAR
export {
  connectToNear,
  callViewMethod,
  callChangeMethod,
  processTwitterCommand,
} from './near/client';
export { 
  ChainType,
  generateChainSignature,
  signTransaction,
  executeTransaction,
  distributeFunds,
} from './near/chain-signatures';

// Firebase & Verification
export { db } from './firebase';
export {
  generateVerificationCode,
  verifyGitHub,
  verifyTwitter,
  verifyEvmSignature,
  verifyNearSignature,
  getVerificationStatus,
} from './verification-service';
