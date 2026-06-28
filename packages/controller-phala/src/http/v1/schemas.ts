import { z } from 'zod';

const RepoUrl = z.string().min(1).max(512);
const GithubUsername = z.string().min(1).max(120);
const NearAccountLike = z.string().min(1).max(120);
const SplitId = z.string().min(1).max(120);
const Token = z.string().min(1).max(32);
const PositiveAmount = z.number().positive().finite();
const Percentage = z.number().min(0).max(100);

const Contributor = z.object({
  github_username: GithubUsername,
  percentage: Percentage,
});

const Recipient = z.object({
  wallet: z.string().min(1).max(256),
  percentage: Percentage,
});

const InsightContributor = z.object({
  username: GithubUsername,
  commits: z.number().int().nonnegative(),
  percentage: Percentage,
});

export const RepoAnalyzeRequest = z.object({ repoUrl: RepoUrl });
export const RepoInsightRequest = z.object({
  repoUrl: RepoUrl,
  contributors: z.array(InsightContributor).min(1).max(50),
});

export const VerificationCheckRequest = z.object({
  githubUsernames: z.array(GithubUsername).min(1).max(200),
});
export const VerificationStoreRequest = z.object({
  githubUsername: GithubUsername,
  walletAddress: z.string().min(1).max(256),
  xUsername: z.string().max(120).optional(),
});

export const ReputationEvaluateRequest = z.object({
  githubUsername: GithubUsername,
  walletAddress: z.string().min(1).max(256).nullable().optional(),
});

export const SplitGetRequest = z.object({ repoUrl: RepoUrl });
export const SplitCreateRequest = z.object({
  repoUrl: RepoUrl,
  owner: NearAccountLike,
  contributors: z.array(Contributor).min(1).max(200),
});
export const SplitUpdateRequest = z.object({
  splitId: SplitId,
  contributors: z.array(Contributor).min(1).max(200),
});

export const PayoutDistributeRequest = z.object({
  splitId: SplitId,
  amount: PositiveAmount,
  token: Token,
  recipients: z.array(Recipient).min(1).max(200),
  preferEngine: z.enum(['auto', 'pingpay', 'hotpay']).optional(),
});

export const PayoutPendingRequest = z.object({
  githubUsername: GithubUsername,
  amount: PositiveAmount,
  token: Token,
});

export const PendingListRequest = z.object({
  target: z.string().min(1).max(512),
});

export const AttestDistributionRequest = z.object({
  splitId: SplitId,
  txHash: z.string().min(1).max(256),
  summary: z.record(z.unknown()),
});

export type TRepoAnalyzeRequest = z.infer<typeof RepoAnalyzeRequest>;
export type TRepoInsightRequest = z.infer<typeof RepoInsightRequest>;
export type TVerificationCheckRequest = z.infer<typeof VerificationCheckRequest>;
export type TVerificationStoreRequest = z.infer<typeof VerificationStoreRequest>;
export type TReputationEvaluateRequest = z.infer<typeof ReputationEvaluateRequest>;
export type TSplitGetRequest = z.infer<typeof SplitGetRequest>;
export type TSplitCreateRequest = z.infer<typeof SplitCreateRequest>;
export type TSplitUpdateRequest = z.infer<typeof SplitUpdateRequest>;
export type TPayoutDistributeRequest = z.infer<typeof PayoutDistributeRequest>;
export type TPayoutPendingRequest = z.infer<typeof PayoutPendingRequest>;
export type TPendingListRequest = z.infer<typeof PendingListRequest>;
export type TAttestDistributionRequest = z.infer<typeof AttestDistributionRequest>;
