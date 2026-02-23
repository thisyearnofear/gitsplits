/**
 * Create Intent
 *
 * Handles commands for creating new splits.
 *
 * Examples:
 * - "create split for near-sdk-rs"
 * - "set up payments for github.com/near/near-sdk-rs"
 * - "make a split for facebook/react with 50/30/20"
 */

import { Intent, ContributorQuality, getVerifyBaseUrl, normalizeRepoUrl, isSystemContributor } from '@gitsplits/shared';

type QualityScoreDecision = {
  quality: number;
  creditAction: ContributorQuality['creditAction'];
};

export function buildQualityScoreDecisionMap(
  qualityScores?: ContributorQuality[]
): Map<string, QualityScoreDecision> {
  const map = new Map<string, QualityScoreDecision>();
  for (const score of qualityScores || []) {
    const username = String(score.username || '').trim().toLowerCase();
    if (!username) continue;
    map.set(username, {
      quality: Math.max(0, Math.min(1, Number(score.quality))),
      creditAction: score.creditAction,
    });
  }
  return map;
}

export function buildDefaultContributorsWithQuality(
  analysisContributors: Array<{ username: string; percentage: number }>,
  qualityScores?: ContributorQuality[]
): Array<{ github_username: string; percentage: number }> {
  const decisions = buildQualityScoreDecisionMap(qualityScores);
  if (!decisions.size) {
    return analysisContributors.map((c) => ({
      github_username: c.username,
      percentage: c.percentage,
    }));
  }

  const included = analysisContributors.filter((contributor) => {
    const key = String(contributor.username || '').trim().toLowerCase();
    return decisions.get(key)?.creditAction !== 'no_credit';
  });

  if (!included.length) {
    // If AI excludes everyone, retain commit-based defaults rather than creating an empty split.
    return analysisContributors.map((c) => ({
      github_username: c.username,
      percentage: c.percentage,
    }));
  }

  const weighted = included.map((contributor) => {
    const key = String(contributor.username || '').trim().toLowerCase();
    const decision = decisions.get(key);
    const weight = decision ? decision.quality : 1.0;
    return {
      username: contributor.username,
      raw: contributor.percentage,
      weight,
    };
  });

  const totalWeighted = weighted.reduce((sum, item) => sum + item.raw * item.weight, 0);
  if (totalWeighted <= 0) {
    return included.map((c) => ({
      github_username: c.username,
      percentage: c.percentage,
    }));
  }

  return weighted.map((item) => ({
    github_username: item.username,
    percentage: Math.round((item.raw * item.weight / totalWeighted) * 100),
  }));
}

export const createIntent: Intent = {
  name: 'create',

  patterns: [
    /create\s+(?:a\s+)?(?:split\s+)?(?:for\s+)?(.+)/i,
    /set\s+up\s+(?:payments?\s+)?(?:for\s+)?(.+)/i,
    /make\s+(?:a\s+)?(?:split\s+)?(?:for\s+)?(.+)/i,
  ],

  extractParams: (matches: RegExpMatchArray) => {
    const fullMatch = matches[1].trim();

    // Check for custom allocation (e.g., "repo with 50/30/20")
    const allocationMatch = fullMatch.match(/(.+?)\s+(?:with\s+)?(\d+(?:\/\d+)+)/);

    if (allocationMatch) {
      return {
        repo: allocationMatch[1].trim(),
        allocation: allocationMatch[2],
      };
    }

    return {
      repo: fullMatch,
      allocation: 'default', // Use contribution-based allocation
    };
  },

  validate: (params: any) => {
    if (!params.repo) {
      return { valid: false, error: 'Repository is required' };
    }
    return { valid: true };
  },

  execute: async (params: any, context: any, tools: any) => {
    const { repo, allocation } = params;

    try {
      const repoUrl = normalizeRepoUrl(repo);
      const verifyBaseUrl = getVerifyBaseUrl();

      // Check if split already exists
      const existing = await tools.near.getSplit(repoUrl);

      // Analyze GitHub repository
      const analysis = await tools.github.analyze(repoUrl);

      if (!analysis.contributors || analysis.contributors.length === 0) {
        return {
          response: `No contributors found for ${repoUrl}. Make sure it's a public repository.`,
          context,
        };
      }

      // Run AI quality scoring to inform allocation weights
      let qualityScores: ContributorQuality[] | undefined;
      try {
        const aiResult = await tools.eigenai.analyzeContributions(
          repoUrl,
          analysis.contributors.slice(0, 10),
        );
        if (aiResult.qualityScores?.length) {
          const scores = aiResult.qualityScores as ContributorQuality[];
          qualityScores = scores;
          const excluded = scores.filter((score: ContributorQuality) => score.creditAction === 'no_credit').length;
          console.log(
            `[Create] AI quality scores applied for ${scores.length} contributors (${excluded} no_credit)`
          );
        }
      } catch (err: any) {
        console.log('[Create] AI quality scoring skipped:', err.message);
      }

      // Calculate allocations — quality-adjusted when AI scores are available
      let contributors;
      if (allocation === 'default') {
        contributors = buildDefaultContributorsWithQuality(analysis.contributors, qualityScores);
      } else {
        // Parse custom allocation (e.g., "50/30/20")
        const percentages = allocation.split('/').map((p: string) => parseInt(p.trim()));
        contributors = analysis.contributors
          .slice(0, percentages.length)
          .map((c: any, i: number) => ({
            github_username: c.username,
            percentage: percentages[i] || 0,
          }));
      }

      // Create split or repair existing empty split on NEAR contract
      let split;
      if (existing && existing.id) {
        split = await tools.near.updateSplit({
          splitId: existing.id,
          contributors,
        });
      } else {
        const ownerId = resolveSplitOwner(context);
        split = await tools.near.createSplit({
          repoUrl,
          owner: ownerId,
          contributors,
        });
      }

      // Format response
      const topContributors = contributors
        .slice(0, 5)
        .map((c: any) => `- ${c.github_username}: ${c.percentage}%`)
        .join('\n');

      const eligible = contributors.filter((c: any) => !isSystemContributor(c.github_username));
      const wallets = await Promise.all(
        eligible.map((c: any) => tools.near.getVerifiedWallet(c.github_username))
      );
      const verifiedCount = wallets.filter(Boolean).length;
      const unverified = eligible
        .map((c: any) => c.github_username)
        .filter((_: string, i: number) => !wallets[i]);
      const skippedBots = contributors.length - eligible.length;

      const coverageLine =
        `Verification coverage: ${verifiedCount}/${eligible.length} verified` +
        (skippedBots > 0 ? ` (${skippedBots} bot/system skipped)` : '');
      const unverifiedLine = unverified.length
        ? `\nNeed verification: ${unverified.slice(0, 5).map((u: string) => `@${u}`).join(', ')}${unverified.length > 5 ? `, +${unverified.length - 5} more` : ''}` +
          `\nInvite link: ${verifyBaseUrl}?repo=${encodeURIComponent(repoUrl.replace(/^github\.com\//, ''))}`
        : '';

      return {
        response:
          `${
            existing && existing.id
              ? `✅ Split updated for ${repoUrl}!`
              : `✅ Split created for ${repoUrl}!`
          }\n\n` +
          `🤖 Powered by GitHub App Automation\n📜 Split ID: ${split.id}\n\n` +
          `Top contributors (verified via Git history):\n${topContributors}` +
          `${contributors.length > 5 ? `\n...and ${contributors.length - 5} more` : ''}\n\n` +
          `${coverageLine}${unverifiedLine}\n\n` +
          `To pay them: "@gitsplits pay 100 USDC to ${repoUrl}"` +
          `${existing && existing.id ? `\n\nThis split was refreshed with the latest contributors.` : ''}`,
        context: {
          ...context,
          lastSplit: {
            id: split.id,
            repoUrl,
            createdAt: Date.now(),
          },
        },
      };

    } catch (error: any) {
      return {
        response: `❌ Failed to create split: ${error.message}`,
        context,
      };
    }
  },
};

function isLikelyNearAccount(value: string): boolean {
  if (!value) return false;
  return /\.near$|\.testnet$/i.test(value);
}

function resolveSplitOwner(context: any): string {
  const candidates = [
    context?.message?.nearAccountId,
    context?.message?.walletAddress,
    context?.farcasterId,
    context?.message?.author,
  ].filter(Boolean);

  const firstNear = candidates.find((candidate: string) => isLikelyNearAccount(candidate));
  if (firstNear) return firstNear;

  if (process.env.NEAR_ACCOUNT_ID) {
    return process.env.NEAR_ACCOUNT_ID;
  }

  throw new Error(
    'No valid NEAR owner account available. Connect a NEAR wallet in web UI or set NEAR_ACCOUNT_ID.'
  );
}
