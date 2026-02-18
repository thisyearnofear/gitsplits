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

import { Intent } from '../core/agent';

export const verifyIntent: Intent = {
  name: 'verify',
  
  patterns: [
    /verify\s+(?:my\s+)?(?:github\s+)?@?([\w-]+)/i,
    /link\s+(?:my\s+)?(?:github\s+)?@?([\w-]+)/i,
    /connect\s+(?:my\s+)?(?:github\s+)?@?([\w-]+)/i,
  ],
  
  extractParams: (matches: RegExpMatchArray) => ({
    githubUsername: matches[1].trim(),
  }),
  
  validate: (params: any) => {
    if (!params.githubUsername) {
      return { valid: false, error: 'GitHub username is required' };
    }
    return { valid: true };
  },
  
  execute: async (params: any, context: any, tools: any) => {
    const { githubUsername } = params;
    const { message } = context;
    
    try {
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
        await tools.near.storeVerification({
          githubUsername,
          walletAddress: nearWallet,
          xUsername: message?.author || 'web',
        });
        return {
          response: `✅ @${githubUsername} verified and linked to ${nearWallet}.`,
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
      await tools.near.storePendingVerification({
        githubUsername,
        farcasterId: message.author,
        code,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      });
      
      return {
        response: `🔐 Verification initiated for @${githubUsername}\n\nTo complete:\n1. Create a public GitHub gist\n2. Paste this code: ${code}\n3. Reply here with the gist URL\n\nOr verify at: https://gitsplits.vercel.app/verify?github=${githubUsername}&code=${code}`,
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
