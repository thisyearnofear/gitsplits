/**
 * Analyze Intent
 * 
 * Handles commands for analyzing repository contributions.
 * 
 * Examples:
 * - "analyze near-sdk-rs"
 * - "who contributes to github.com/near/near-sdk-rs"
 * - "show contributors for facebook/react"
 */

import { Intent } from '../core/agent';

export const analyzeIntent: Intent = {
  name: 'analyze',
  
  patterns: [
    /analyze\s+(.+)/i,
    /who\s+(?:contributes?\s+to|works?\s+on)\s+(.+)/i,
    /show\s+(?:me\s+)?(?:the\s+)?contributors?\s+(?:for|of)\s+(.+)/i,
    /what\s+(?:about|is)\s+(.+)/i,
  ],
  
  extractParams: (matches: RegExpMatchArray) => ({
    repo: matches[1].trim(),
  }),
  
  validate: (params: any) => {
    if (!params.repo) {
      return { valid: false, error: 'Repository is required' };
    }
    return { valid: true };
  },
  
  execute: async (params: any, context: any, tools: any) => {
    const { repo } = params;
    
    try {
      const repoUrl = normalizeRepoUrl(repo);
      
      // Analyze GitHub repository
      const analysis = await tools.github.analyze(repoUrl);
      
      if (!analysis.contributors || analysis.contributors.length === 0) {
        return {
          response: `No contributors found for ${repoUrl}. Make sure it's a public repository with commit history.`,
          context,
        };
      }
      
      // Format top contributors
      const topContributors = analysis.contributors
        .slice(0, 5)
        .map((c: any, i: number) => {
          const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '•';
          return `${medal} ${c.username}: ${c.commits} commits (${c.percentage}%)`;
        })
        .join('\n');
      
      const totalCommits = analysis.contributors.reduce(
        (sum: number, c: any) => sum + c.commits, 0
      );

      // Proactive verification coverage so maintainers can invite contributors early.
      let verificationCoverage = '';
      try {
        const sample = analysis.contributors.slice(0, 10);
        const walletChecks = await Promise.all(
          sample.map((c: any) => tools.near.getVerifiedWallet(c.username))
        );
        const verifiedInSample = walletChecks.filter(Boolean).length;
        verificationCoverage =
          `\n\n✅ Verification coverage (top ${sample.length}): ` +
          `${verifiedInSample}/${sample.length} verified` +
          `\nInvite unverified contributors: https://gitsplits.xyz/verify`;
      } catch (err: any) {
        console.log('[Analyze] Verification coverage skipped:', err.message);
      }
      
      // Run verifiable AI analysis via EigenAI
      let aiInsight = '';
      let aiSignature = '';
      const strictEigenAiInTest =
        process.env.AGENT_MODE === 'production' && process.env.NODE_ENV === 'test';
      try {
        const aiResult = await tools.eigenai.analyzeContributions(
          repoUrl,
          analysis.contributors.slice(0, 10),
        );
        const explorerLink = aiResult.explorerUrl ? `\n🔗 Verify on deTERMinal: ${aiResult.explorerUrl}` : '';
        aiInsight = aiResult.analysis ? `\n\n🛡️ Verifiable AI Insight:\n${aiResult.analysis}${explorerLink}` : '';
      } catch (err: any) {
        if (strictEigenAiInTest) {
          throw new Error(`[EigenAI] ${err.message}`);
        }
        console.log('[Analyze] EigenAI analysis skipped:', err.message);
      }

      const teeInfo = tools.teeWallet.isRunningInTEE() ? `\n\n🔒 Signed by TEE: ${tools.teeWallet.getAddress()}` : '';
      
      return {
        response: `📊 Analysis for ${repoUrl}\n\nTotal commits: ${totalCommits}\nContributors: ${analysis.contributors.length}\n\nTop contributors:\n${topContributors}${analysis.contributors.length > 5 ? `\n...and ${analysis.contributors.length - 5} more` : ''}${verificationCoverage}${aiInsight}${teeInfo}\n\nCreate a split: "@gitsplits create ${repoUrl}"`,
        context: {
          ...context,
          lastAnalysis: {
            repoUrl,
            contributors: analysis.contributors,
            timestamp: Date.now(),
          },
        },
      };
      
    } catch (error: any) {
      return {
        response: `❌ Analysis failed: ${error.message}`,
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
