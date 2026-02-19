import { createActionPlan } from '../src/agentic/planner';
import { evaluatePolicy } from '../src/agentic/policy';
import { inspectDistributionRisk, shouldBlockForSafety } from '../src/agentic/safety';

describe('agentic hardening controls', () => {
  test('planner returns deterministic shape with id and expiry', () => {
    const plan = createActionPlan({
      intent: 'pay',
      params: { amount: 1, token: 'NEAR', repo: 'github.com/example/repo' },
      dependencies: ['split_exists'],
      risks: ['onchain_value_transfer'],
      outputs: ['tx_hash_or_intent_ref'],
      confidence: 0.91,
    });

    expect(plan.id).toMatch(/^plan-/);
    expect(plan.expiresAt).toBeGreaterThan(plan.createdAt);
    expect(plan.intent).toBe('pay');
  });

  test('policy blocks invalid pay amount', () => {
    const decision = evaluatePolicy({
      intentName: 'pay',
      params: { amount: 0, token: 'NEAR', repo: 'github.com/example/repo' },
      mode: 'execute',
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reasons.join(' ')).toContain('positive');
  });

  test('safety flags bot-heavy allocations and blocks without override', () => {
    const alerts = inspectDistributionRisk([
      { github_username: 'ci-bot', percentage: 60, wallet: 'ci.near' },
      { github_username: 'human1', percentage: 20, wallet: 'h1.near' },
      { github_username: 'human2', percentage: 20, wallet: 'h2.near' },
    ]);

    expect(alerts.some((a) => a.code === 'BOT_HEAVY')).toBe(true);
    expect(shouldBlockForSafety(alerts, '')).toBe(true);
    expect(shouldBlockForSafety(alerts, 'override safety')).toBe(false);
  });
});
