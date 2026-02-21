interface ReputationProfile {
  subject: string;
  kind: 'human' | 'agent' | 'unknown';
  score: number;
  tier: 'bronze' | 'silver' | 'gold';
  sources: string[];
  erc8004?: {
    registered: boolean;
    handle?: string;
    proofUrl?: string;
  };
}

function inferKind(subject: string): 'human' | 'agent' | 'unknown' {
  const normalized = String(subject || '').toLowerCase();
  if (!normalized) return 'unknown';
  if (normalized.includes('[bot]') || normalized.endsWith('-bot') || normalized.includes('agent')) {
    return 'agent';
  }
  return 'human';
}

function tierFromScore(score: number): 'bronze' | 'silver' | 'gold' {
  if (score >= 80) return 'gold';
  if (score >= 55) return 'silver';
  return 'bronze';
}

export const reputationTool = {
  name: 'reputation',

  async getProfile(subject: string): Promise<ReputationProfile> {
    const kind = inferKind(subject);
    let score = kind === 'agent' ? 60 : kind === 'human' ? 70 : 50;
    const sources = ['local-heuristics'];

    const repApi = process.env.REPUTATION_API_BASE;
    if (repApi) {
      try {
        const response = await fetch(`${repApi.replace(/\/+$/, '')}/profile?subject=${encodeURIComponent(subject)}`);
        if (response.ok) {
          const data: any = await response.json();
          if (typeof data.score === 'number') {
            score = data.score;
            sources.push('external-reputation-api');
          }
        }
      } catch {
        // Non-fatal.
      }
    }

    let erc8004: ReputationProfile['erc8004'] | undefined;
    const ercApi = process.env.ERC8004_REGISTRY_API;
    if (ercApi && kind === 'agent') {
      try {
        const response = await fetch(`${ercApi.replace(/\/+$/, '')}/lookup?subject=${encodeURIComponent(subject)}`);
        if (response.ok) {
          const data: any = await response.json();
          erc8004 = {
            registered: Boolean(data?.registered),
            handle: data?.handle ? String(data.handle) : undefined,
            proofUrl: data?.proofUrl ? String(data.proofUrl) : undefined,
          };
          sources.push('erc8004-registry');
          if (erc8004.registered) {
            score = Math.min(100, score + 15);
          }
        }
      } catch {
        // Non-fatal.
      }
    }

    return {
      subject,
      kind,
      score,
      tier: tierFromScore(score),
      sources,
      erc8004,
    };
  },

  async evaluatePayoutEligibility(input: { githubUsername: string; walletAddress?: string | null }) {
    const profile = await this.getProfile(input.githubUsername);
    const minScore = Number(process.env.REPUTATION_MIN_PAYOUT_SCORE || '50');
    const hasWallet = Boolean(input.walletAddress);

    const eligible = hasWallet && profile.score >= minScore;
    const reasons: string[] = [];
    if (!hasWallet) reasons.push('Missing verified payout wallet.');
    if (profile.score < minScore) reasons.push(`Reputation score ${profile.score} below threshold ${minScore}.`);

    return {
      eligible,
      profile,
      reasons,
    };
  },
};
