import { assistIntent } from '../src/agentic/intent-assistant';
import { reputationTool } from '../src/tools/reputation';

describe('hands-off assistant + reputation', () => {
  test('heuristically infers analyze intent from natural language', async () => {
    const result = await assistIntent('can you analyze thisyearnofear/gitsplits and tell me who to reward?');
    expect(result).toBeTruthy();
    expect(result?.intentName).toBe('analyze');
    expect(String(result?.params?.repo || '')).toContain('github.com/thisyearnofear/gitsplits');
  });

  test('reputation tool marks agent-like usernames as agent kind', async () => {
    const profile = await reputationTool.getProfile('lovable-dev[bot]');
    expect(profile.kind).toBe('agent');
    expect(profile.score).toBeGreaterThan(0);
  });

  test('eligibility requires wallet + minimum score', async () => {
    const decision = await reputationTool.evaluatePayoutEligibility({
      githubUsername: 'example-user',
      walletAddress: null,
    });
    expect(decision.eligible).toBe(false);
    expect(decision.reasons.join(' ')).toContain('wallet');
  });
});
