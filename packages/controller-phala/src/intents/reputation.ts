import { Intent } from '@gitsplits/shared';

export const reputationIntent: Intent = {
  name: 'reputation',

  patterns: [
    /reputation\s+(?:for\s+)?@?([a-zA-Z0-9_.\-\[\]]+)/i,
    /is\s+@?([a-zA-Z0-9_.\-\[\]]+)\s+(?:eligible|trusted|reputable)/i,
    /erc8004\s+(?:status\s+)?(?:for\s+)?@?([a-zA-Z0-9_.\-\[\]]+)/i,
  ],

  extractParams: (matches: RegExpMatchArray) => ({
    subject: matches[1].trim(),
  }),

  validate: (params: any) => {
    if (!params.subject) {
      return { valid: false, error: 'Subject is required' };
    }
    return { valid: true };
  },

  execute: async (params: any, context: any, tools: any) => {
    try {
      const profile = await tools.reputation.getProfile(params.subject);
      const ercLine = profile.erc8004
        ? profile.erc8004.registered
          ? `✅ ERC-8004: registered${profile.erc8004.handle ? ` (${profile.erc8004.handle})` : ''}`
          : '⚠️ ERC-8004: not registered'
        : 'ℹ️ ERC-8004: not configured';

      return {
        response:
          `🏅 Reputation for @${profile.subject}\n\n` +
          `Kind: ${profile.kind}\n` +
          `Score: ${profile.score}/100 (${profile.tier})\n` +
          `${ercLine}\n` +
          `Sources: ${profile.sources.join(', ')}`,
        context,
      };
    } catch (error: any) {
      return {
        response: `❌ Reputation lookup failed: ${error.message}`,
        context,
      };
    }
  },
};
