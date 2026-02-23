/**
 * Verify Intent
 *
 * Handles identity verification commands.
 *
 * Examples:
 * - "verify my-github-username"
 * - "link my github my-github-username"
 * - "verify identity for my-github-username"
 */

import { Intent, getVerifyBaseUrl, normalizeRepoUrl, isSystemContributor } from '@gitsplits/shared';

export const verifyIntent: Intent = {
  name: 'verify',

  patterns: [
    /verify\s+contributors?\s+(?:for|of)\s+(?<repo>.+)/i,
    /verify\s+(?!contributors?\b)(?:my\s+)?(?:github\s+)?@?(?<githubUsername>[a-zA-Z0-9_.\-\[\]]+)/i,
    /link\s+(?:my\s+)?(?:github\s+)?@?(?<githubUsername>[a-zA-Z0-9_.\-\[\]]+)/i,
    /connect\s+(?:my\s+)?(?:github\s+)?@?(?<githubUsername>[a-zA-Z0-9_.\-\[\]]+)/i,
  ],

  extractParams: (matches: RegExpMatchArray) => {
    const groups = matches.groups || {};
    const repo = groups.repo?.trim();
    const githubUsername = groups.githubUsername?.trim();
    return { repo, githubUsername };
  },

  validate: (params: any) => {
    if (!params.repo && !params.githubUsername) {
      return { valid: false, error: 'GitHub username or repository is required' };
    }
    return { valid: true };
  },

  execute: async (params: any, context: any, tools: any) => {
    const { githubUsername, repo } = params;
    const { message } = context;

    try {
      if (repo) {
        const verifyBaseUrl = getVerifyBaseUrl();
        const repoUrl = normalizeRepoUrl(repo);
        const analysis = await tools.github.analyze(repoUrl);

        if (!analysis.contributors || analysis.contributors.length === 0) {
          return {
            response: `No contributors found for ${repoUrl}.`,
            context,
          };
        }

        const sample = analysis.contributors.slice(0, 15);
        const eligible = sample.filter((c: any) => !isSystemContributor(c.username));
        const skippedSystem = sample.filter((c: any) => isSystemContributor(c.username)).map((c: any) => c.username);
        const wallets = await Promise.all(
          eligible.map((c: any) => tools.near.getVerifiedWallet(c.username))
        );

        const verified = eligible
          .map((c: any, i: number) => ({ username: c.username, wallet: wallets[i] }))
          .filter((entry: any) => !!entry.wallet);
        const unverified = eligible
          .map((c: any) => c.username)
          .filter((username: string, i: number) => !wallets[i]);

        const verifiedPreview = verified.slice(0, 5);
        const unverifiedPreview = unverified.slice(0, 5);
        const repoPath = repoUrl.replace(/^github\.com\//, '');

        const verifiedLines = verifiedPreview.length
          ? verifiedPreview.map((entry: any) => `✅ @${entry.username} -> ${entry.wallet}`).join('\n')
          : 'None yet';

        const unverifiedLines = unverifiedPreview.length
          ? unverifiedPreview
              .map((username: string) =>
                `• @${username}: ${verifyBaseUrl}?repo=${encodeURIComponent(repoPath)}&user=${encodeURIComponent(username)}`
              )
              .join('\n')
          : 'None';

        const verifiedOverflow =
          verified.length > verifiedPreview.length
            ? `\n...and ${verified.length - verifiedPreview.length} more verified`
            : '';
        const unverifiedOverflow =
          unverified.length > unverifiedPreview.length
            ? `\n...and ${unverified.length - unverifiedPreview.length} more unverified`
            : '';

        const nextStep = unverified.length
          ? `\n\nNext: share the links above with unverified contributors.`
          : `\n\nNext: everyone checked is verified. You can safely run: pay <amount> <token> to ${repoPath}`;
        const skippedLine = skippedSystem.length
          ? `\nSkipped bot/system accounts: ${skippedSystem.slice(0, 4).map((u: string) => `@${u}`).join(', ')}${skippedSystem.length > 4 ? `, +${skippedSystem.length - 4} more` : ''}`
          : '';

        return {
          response:
            `🔎 Verification status for ${repoUrl}\n\n` +
            `Coverage (top ${sample.length} contributors): ${verified.length} verified, ${unverified.length} unverified` +
            `${skippedSystem.length ? `, ${skippedSystem.length} skipped` : ''}` +
            `${skippedLine}\n\n` +
            `Ready to receive payouts:\n${verifiedLines}${verifiedOverflow}\n\n` +
            `Need verification:\n${unverifiedLines}${unverifiedOverflow}${nextStep}`,
          context: {
            ...context,
            lastVerificationCoverage: {
              repoUrl,
              checked: sample.length,
              verified: verified.length,
              unverified: unverified.length,
              timestamp: Date.now(),
            },
          },
        };
      }

      // Check if already verified
      const wallet = await tools.near.getVerifiedWallet(githubUsername);
      if (wallet) {
        return {
          response: `@${githubUsername} is already verified! You can receive payments to ${wallet}.`,
          context,
        };
      }

      // If web context includes a NEAR account, store verification on-chain immediately.
      const nearWallet =
        message?.nearAccountId ||
        (isLikelyNearAccount(message?.walletAddress) ? message?.walletAddress : null);

      if (message?.type === 'web' && nearWallet) {
        const profile = await tools.reputation.getProfile(githubUsername);
        await tools.near.storeVerification({
          githubUsername,
          walletAddress: nearWallet,
          xUsername: message?.author || 'web',
        });
        return {
          response:
            `✅ @${githubUsername} verified and linked to ${nearWallet}.` +
            `\n🏅 Reputation: ${profile.score}/100 (${profile.tier})` +
            `${profile.erc8004?.registered ? '\n🤖 ERC-8004 agent registration detected.' : ''}`,
          context: {
            ...context,
            lastVerification: {
              githubUsername,
              wallet: nearWallet,
              verifiedAt: Date.now(),
            },
          },
        };
      }

      // Generate verification code for social channels.
      const code = `gitsplits-verify-${Math.random().toString(36).substring(2, 10)}`;
      const verifyBaseUrl = getVerifyBaseUrl();
      await tools.near.storePendingVerification({
        githubUsername,
        farcasterId: message.author,
        code,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      });

      return {
        response: `🔐 Verification initiated for @${githubUsername}\n\nTo complete:\n1. Create a public GitHub gist\n2. Paste this code: ${code}\n3. Reply here with the gist URL\n\nOr verify at: ${verifyBaseUrl}?github=${githubUsername}&code=${code}`,
        context: {
          ...context,
          pendingVerification: {
            githubUsername,
            code,
            expiresAt: Date.now() + 24 * 60 * 60 * 1000,
          },
        },
      };

    } catch (error: any) {
      return {
        response: `❌ Verification failed: ${error.message}`,
        context,
      };
    }
  },
};

function isLikelyNearAccount(value: string | undefined): boolean {
  if (!value) return false;
  return /\.near$|\.testnet$/i.test(value);
}

