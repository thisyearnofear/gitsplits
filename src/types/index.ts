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
  contributors: {
    username: string;
    contributions: number;
    avatar_url?: string;
  }[];
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
  contractAddress: string;
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

export interface Contributor {
  login: string;
  contributions: number;
  avatar_url?: string;
}

export interface EmbedCodeProps {
  repoInfo: RepoInfo;
  contractAddress: string;
  displayStyle: "minimal" | "expanded";
}
