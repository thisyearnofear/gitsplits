import { reputationTool } from '../../../tools/reputation';
import { TReputationEvaluateRequest } from '../schemas';

export async function evaluateReputation(req: TReputationEvaluateRequest): Promise<{
  githubUsername: string;
  eligible: boolean;
  reasons: string[];
  profile: unknown;
}> {
  const decision = await reputationTool.evaluatePayoutEligibility({
    githubUsername: req.githubUsername,
    walletAddress: req.walletAddress ?? null,
  });

  return {
    githubUsername: req.githubUsername,
    eligible: decision.eligible,
    reasons: decision.reasons,
    profile: decision.profile,
  };
}
