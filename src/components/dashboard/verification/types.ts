export interface VerificationCenterProps {
  isGitHubConnected: boolean;
  setIsGitHubConnected: (connected: boolean) => void;
  walletAddress?: string;
}

export type VerificationStep = "input" | "signature" | "verify";

export type VerificationLevel = 1 | 2 | 3 | 4;

export interface VerificationStatus {
  githubVerified: boolean;
  twitterVerified: boolean;
  githubUsername?: string;
  twitterHandle?: string;
}

export interface PendingDistribution {
  id: string;
  repo: string;
  amount: string;
  token: string;
}
