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
      
      // Check if all contributors have verified wallets
      const unverified = contributors.filter((c: any) => !c.wallet);
      if (unverified.length > 0) {
        return {
          response: `Some contributors haven't verified their wallets yet: ${unverified.map((c: any) => c.github_username).join(', ')}. They can verify at https://gitsplits.xyz/verify`,
          context,
        };
      }
      
      // Execute distribution via Ping Pay
      const distribution = await tools.pingpay.distribute({
        splitId: split.id,
        amount,
        token,
        recipients: contributors.map((c: any) => ({
          wallet: c.wallet,
          percentage: c.percentage,
        })),
      });
      
      return {
        response: `✅ Paid ${amount} ${token} to ${contributors.length} contributors!\n\nTransaction: ${distribution.txHash}\nSplit: ${split.id}`,
        context: {
          ...context,
          lastPayment: {
            splitId: split.id,
            amount,
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
