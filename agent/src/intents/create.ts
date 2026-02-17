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

import { Intent } from '../core/agent';

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
      
      // Check if split already exists
      const existing = await tools.near.getSplit(repoUrl);
      if (existing) {
        return {
          response: `A split already exists for ${repoUrl}. View it with: "@gitsplits splits ${repoUrl}"`,
          context,
        };
      }
      
      // Analyze GitHub repository
      const analysis = await tools.github.analyze(repoUrl);
      
      if (!analysis.contributors || analysis.contributors.length === 0) {
        return {
          response: `No contributors found for ${repoUrl}. Make sure it's a public repository.`,
          context,
        };
      }
      
      // Calculate allocations
      let contributors;
      if (allocation === 'default') {
        // Use analysis-based allocation
        contributors = analysis.contributors.map((c: any) => ({
          github_username: c.username,
          percentage: c.percentage,
        }));
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
      
      // Create split on NEAR contract
      const ownerId = context?.farcasterId || context?.message?.author || 'unknown';
      const split = await tools.near.createSplit({
        repoUrl,
        owner: ownerId,
        contributors,
      });
      
      // Format response
      const topContributors = contributors
        .slice(0, 5)
        .map((c: any) => `- ${c.github_username}: ${c.percentage}%`)
        .join('\n');
      
      return {
        response: `✅ Split created for ${repoUrl}!\n\nSplit ID: ${split.id}\n\nTop contributors:\n${topContributors}${contributors.length > 5 ? `\n...and ${contributors.length - 5} more` : ''}\n\nTo pay them: "@gitsplits pay 100 USDC to ${repoUrl}"`,
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

function normalizeRepoUrl(input: string): string {
  let cleaned = input
    .replace(/^(https?:\/\/)?(www\.)?github\.com\//, '')
    .replace(/\/$/, '')
    .trim();
  
  return `github.com/${cleaned}`;
}
