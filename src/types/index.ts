// types.ts

import { ReactNode } from "react";

export interface RepoInfo {
  name: string;
  owner: string;
  isFork: boolean;
  originalRepo: {
    name: string;
    owner: string;
  } | null;
  contributors: Contributor[];
}

export interface Contributor {
  username: string;
  contributions: number;
  avatar_url: string;
}

export interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
}

export interface StepCardProps {
  number: string;
  title: string;
  description: string;
}

export interface EnhancedAttributionWidgetProps {
  repoInfo: RepoInfo;
  contractAddress: string;
  displayStyle: "minimal" | "expanded";
}

export interface LandingPageProps {
  isConnected: boolean;
  onDashboardClick: () => void;
  onLoginPrompt: () => void;
}

export interface AttributionWidgetProps {
  repoInfo: RepoInfo;
  contractAddress?: string; // Make contractAddress optional
  displayStyle: "minimal" | "expanded";
  onSupportClick: () => void;
}

export interface SimplifiedSplitsSetupProps {
  onLoginRequired: () => void;
  isConnected: boolean;
}

export type HomeProps = Record<string, unknown>;

export interface DashboardProps {
  isGitHubConnected: boolean;
  setIsGitHubConnected: (isConnected: boolean) => void;
}

export interface RepoCardProps {
  name: string;
  owner: string;
  stats: {
    tips: string;
    contributors: number;
    forks: number;
  };
  onSelect: () => void;
}

export interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
}

export interface PreviewCardProps {
  type: string;
  title: string;
  description: string;
}

export interface SplitsTableProps {
  splits: {
    avatar_url: string;
    login: string;
    contributions: number;
    percentage: string;
  }[];
}

export interface EmbedCodeProps {
  repoInfo: RepoInfo;
  contractAddress: string;
  displayStyle: "minimal" | "expanded";
}

// Security and verification types

export enum VerificationLevel {
  None = 0,
  Basic = 1, // X account age > 3 months, minimum followers
  GitHub = 2, // Verified GitHub account connection
  Repository = 3, // Demonstrated repository control
}

export interface VerificationRequest {
  id: string;
  twitterUsername: string;
  githubUsername: string;
  verificationCode: string;
  createdAt: number;
  expiresAt: number;
  status: "pending" | "completed" | "expired" | "failed";
}

export interface UserIdentity {
  twitterUsername: string;
  githubUsername: string;
  verificationLevel: VerificationLevel;
  walletAddress?: string;
  verifiedAt: number;
}

export interface SplitConfig {
  id: string;
  repoUrl: string;
  owner: string;
  contributors: SplitContributor[];
  createdAt: number;
  updatedAt: number;
}

export interface SplitContributor {
  githubUsername: string;
  walletAddress?: string;
  percentage: number;
}

export interface Distribution {
  id: string;
  splitId: string;
  amount: number;
  token: string;
  timestamp: number;
  transactions: Transaction[];
}

export interface Transaction {
  chainId: string;
  recipient: string;
  amount: string;
  txHash?: string;
  status: "pending" | "completed" | "failed";
}
