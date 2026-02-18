/**
 * Pay Intent
 * 
 * Handles natural language commands for paying contributors.
 * 
 * Examples:
 * - "pay 100 USDC to near-sdk-rs"
 * - "send 50 NEAR to github.com/near/near-sdk-rs"
 * - "distribute $200 to the React team"
 */

import { Intent } from '../core/agent';
import { getVerifyBaseUrl } from '../config';

export const payIntent: Intent = {
  name: 'pay',
  
  // Patterns that trigger this intent
  patterns: [
    /pay\s+(\d+(?:\.\d+)?)\s*(\w+)\s+(?:to\s+)?(.+)/i,
    /send\s+(\d+(?:\.\d+)?)\s*(\w+)\s+(?:to\s+)?(.+)/i,
    /distribute\s+(?:\$)?(\d+(?:\.\d+)?)\s*(\w*)\s+(?:to\s+)?(.+)/i,
    /give\s+(\d+(?:\.\d+)?)\s*(\w+)\s+(?:to\s+)?(.+)/i,
  ],
  
  // Extract parameters from matched patterns
  extractParams: (matches: RegExpMatchArray) => ({
    amount: parseFloat(matches[1]),
    token: matches[2]?.toUpperCase() || 'USDC',
    repo: matches[3].trim(),
  }),
  
  // Validate extracted parameters
  validate: (params: any) => {
    if (!params.amount || params.amount <= 0) {
      return { valid: false, error: 'Amount must be a positive number' };
    }
    if (!params.repo) {
      return { valid: false, error: 'Repository is required' };
    }
    return { valid: true };
  },
  
  // Execute the intent
  execute: async (params: any, context: any, tools: any) => {
    const { amount, token, repo } = params;
    const verifyBaseUrl = getVerifyBaseUrl();
    
    try {
      // Normalize repo URL
      const repoUrl = normalizeRepoUrl(repo);
      
      // Check if split exists
      const split = await tools.near.getSplit(repoUrl);
      
      if (!split) {
        return {
          response: `No split found for ${repoUrl}. Create one first with: "@gitsplits create ${repoUrl}"`,
          context,
        };
      }
      
      // Get verified wallets for contributors
      const contributors = await Promise.all(
        split.contributors.map(async (c: any) => ({
          ...c,
          wallet: await tools.near.getVerifiedWallet(c.github_username),
        }))
      );
      
      const strictMode = isStrictAllVerifiedMode(context?.message?.text || '');

      // Split verified/unverified contributors
      const unverified = contributors.filter((c: any) => !c.wallet);
      const verified = contributors.filter((c: any) => !!c.wallet);

      if (strictMode && unverified.length > 0) {
        return {
          response:
            `❌ Strict mode enabled: payment blocked because ${unverified.length} contributors are unverified.\n\n` +
            `Unverified: ${unverified.map((c: any) => c.github_username).join(', ')}\n` +
            `Ask them to verify at ${verifyBaseUrl}`,
          context,
        };
      }

      if (verified.length === 0) {
        return {
          response:
            `❌ No verified contributors found for ${repoUrl}. Nothing can be paid yet.\n\n` +
            `Ask contributors to verify at ${verifyBaseUrl}`,
          context,
        };
      }

      // In default mode, pay verified contributors now and store pending claims for unverified.
      const verifiedPercentage = verified.reduce((sum: number, c: any) => sum + Number(c.percentage), 0);
      const distributableAmount = (amount * verifiedPercentage) / 100;
      const normalizedRecipients = verified.map((c: any) => ({
        wallet: c.wallet,
        percentage: verifiedPercentage > 0 ? (Number(c.percentage) / verifiedPercentage) * 100 : 0,
      }));

      const pendingClaims: Array<{ github_username: string; amount: number; token: string; id: string }> = [];
      if (unverified.length > 0) {
        for (const contributor of unverified) {
          const pendingAmount = (amount * Number(contributor.percentage)) / 100;
          const pendingId = await tools.near.storePendingDistribution({
            githubUsername: contributor.github_username,
            amount: pendingAmount,
            token,
          });
          pendingClaims.push({
            github_username: contributor.github_username,
            amount: pendingAmount,
            token,
            id: pendingId,
          });
        }
      }
      
      // Execute distribution
      let distribution;
      let providerName = 'Ping Pay';
      const isHotPayPreferred = token === 'NEAR' || context.message?.text?.toLowerCase().includes('hotpay');
      
      if (isHotPayPreferred) {
        console.log('[Agent] Using HOT Pay for distribution');
        distribution = await tools.hotpay.distribute({
          splitId: split.id,
          amount: distributableAmount,
          token,
          recipients: normalizedRecipients,
        });
        providerName = 'HOT Pay';
      } else {
        console.log('[Agent] Using Ping Pay for distribution');
        try {
          distribution = await tools.pingpay.distribute({
            splitId: split.id,
            amount: distributableAmount,
            token,
            recipients: normalizedRecipients,
          });
        } catch (pingErr: any) {
          if (process.env.HOT_PAY_JWT) {
            console.log(`[Agent] Ping Pay failed (${pingErr?.message || 'unknown error'}), falling back to HOT Pay`);
            distribution = await tools.hotpay.distribute({
              splitId: split.id,
              amount: distributableAmount,
              token,
              recipients: normalizedRecipients,
            });
            providerName = 'HOT Pay (Ping Pay fallback)';
          } else {
            throw pingErr;
          }
        }
      }
      
      const protocolInfo =
        providerName.startsWith('HOT Pay') || isHotPayPreferred
          ? 'HOT Partner API'
          : 'NEAR Intents & Chain Signatures';
      const teeSignature = tools.teeWallet.isRunningInTEE() ? `\n🔒 TEE Signature: ${tools.teeWallet.getAddress()}` : '';
      const pendingSummary =
        pendingClaims.length > 0
          ? `\n\n⏳ Pending claims for unverified contributors (${pendingClaims.length}):\n` +
            pendingClaims
              .map((c) => `- ${c.github_username}: ${c.amount.toFixed(4)} ${c.token} (claim id: ${c.id})`)
              .join('\n') +
            `\n\nInvite them to verify: ${verifyBaseUrl}`
          : '';
      
      return {
        response:
          `✅ Distributed ${distributableAmount.toFixed(4)} ${token} to ${verified.length} verified contributors via ${providerName}!\n\n` +
          `Coverage: ${verified.length}/${contributors.length} contributors verified\n` +
          `🌐 Protocol: ${protocolInfo}\n🔗 Transaction: ${distribution.txHash}\n📜 Split: ${split.id}${teeSignature}${pendingSummary}`,
        context: {
          ...context,
          lastPayment: {
            splitId: split.id,
            amount: distributableAmount,
            token,
            txHash: distribution.txHash,
            timestamp: Date.now(),
          },
        },
      };
      
    } catch (error: any) {
      return {
        response: `❌ Payment failed: ${error.message}`,
        context,
      };
    }
  },
};

function isStrictAllVerifiedMode(text: string): boolean {
  const normalized = text.toLowerCase();
  return (
    normalized.includes('strict') ||
    normalized.includes('all-verified') ||
    normalized.includes('all verified')
  );
}

/**
 * Normalize repository URL from various formats
 */
function normalizeRepoUrl(input: string): string {
  // Remove common prefixes/suffixes
  let cleaned = input
    .replace(/^(https?:\/\/)?(www\.)?github\.com\//, '')
    .replace(/\/$/, '')
    .trim();
  
  // Handle "owner/repo" format
  if (!cleaned.includes('/')) {
    // Try to find from context or return as-is
    return cleaned;
  }
  
  return `github.com/${cleaned}`;
}
