// Services
export { getRepoInfo, validateGitHubUsername } from './services/api';
export { processCommand } from './services/commands';
export { parseCommand, CommandType, ParsedCommand } from './services/parser';
export { twitterClient } from './services/twitter';
export { generateEmbedCode } from './services/embed';

// NEAR
export {
  connectToNear,
  getContract,
  distributePayments,
  createSplit,
  getSplit,
  addContributor,
  removeContributor,
  executePayment,
  getContributorShares,
  verifyContributor,
  isContributorVerified,
} from './near/client';
export { requestChainSignature, verifyChainSignature } from './near/chain-signatures';

// Firebase & Verification
export { db } from './firebase';
export {
  generateVerificationCode,
  verifyIdentity,
  getVerificationStatus,
  getPendingVerifications,
  approveVerification,
  rejectVerification,
} from './verification-service';
