/**
 * Pending Intent
 *
 * Shows pending claims for a repository or a single GitHub username.
 */

import { Intent } from '@gitsplits/shared';
import { getVerifyBaseUrl } from '@gitsplits/shared';

export const pendingIntent: Intent = {
  name: 'pending',

  patterns: [
    /pending\s+(?:claims?\s+)?(?:for\s+)?(.+)/i,
    /show\s+pending\s+(?:claims?\s+)?(?:for\s+)?(.+)/i,
  ],

  extractParams: (matches: RegExpMatchArray) => ({
    target: matches[1].trim(),
  }),

  validate: (params: any) => {
    if (!params.target) {
      return { valid: false, error: 'Repository or GitHub username is required' };
    }
    return { valid: true };
  },

  execute: async (params: any, context: any, tools: any) => {
    const target = params.target as string;
    const verifyBaseUrl = getVerifyBaseUrl();

    try {
      if (looksLikeRepo(target)) {
        const repoUrl = normalizeRepoUrl(target);
        const split = await tools.near.getSplit(repoUrl);
        if (!split) {
          return {
            response: `No split found for ${repoUrl}.`,
            context,
          };
        }

        const pendingByUser: Array<{ username: string; claims: any[] }> = [];
        for (const contributor of split.contributors || []) {
          const claims = await tools.near.getPendingDistributions(contributor.github_username);
          if (claims && claims.length > 0) {
            pendingByUser.push({
              username: contributor.github_username,
              claims,
            });
          }
        }

        const totalClaims = pendingByUser.reduce((sum, item) => sum + item.claims.length, 0);
        if (totalClaims === 0) {
          return {
            response: `No pending claims for ${repoUrl}.`,
            context,
          };
        }

        const lines = pendingByUser
          .slice(0, 10)
          .map((item) => {
            const totalAmount = item.claims.reduce((sum: number, c: any) => sum + Number(c.amount || 0), 0);
            const token = item.claims[0]?.token || 'token';
            return `- ${item.username}: ${item.claims.length} claim(s), ${totalAmount} ${token}`;
          })
          .join('\n');

        return {
          response:
            `⏳ Pending claims for ${repoUrl}\n\n` +
            `Contributors with pending claims: ${pendingByUser.length}\n` +
            `Total pending claim entries: ${totalClaims}\n\n` +
            `${lines}\n\n` +
            `Ask contributors to verify at ${verifyBaseUrl}`,
          context,
        };
      }

      const githubUsername = target.replace(/^@/, '');
      const claims = await tools.near.getPendingDistributions(githubUsername);
      if (!claims || claims.length === 0) {
        return {
          response: `No pending claims found for @${githubUsername}.`,
          context,
        };
      }

      const lines = claims
        .slice(0, 10)
        .map((c: any) => `- ${c.id}: ${c.amount} ${c.token}`)
        .join('\n');

      return {
        response:
          `⏳ Pending claims for @${githubUsername}\n\n` +
          `Count: ${claims.length}\n${lines}`,
        context,
      };
    } catch (error: any) {
      return {
        response: `❌ Failed to fetch pending claims: ${error.message}`,
        context,
      };
    }
  },
};

function looksLikeRepo(input: string): boolean {
  return input.includes('/') || input.includes('github.com');
}

function normalizeRepoUrl(input: string): string {
  let cleaned = input
    .replace(/^(https?:\/\/)?(www\.)?github\.com\//, '')
    .replace(/\/$/, '')
    .trim();

  return `github.com/${cleaned}`;
}
