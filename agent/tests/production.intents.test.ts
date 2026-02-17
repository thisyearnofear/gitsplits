import { processMessage } from '../src/index';
import {
  assertContainsAny,
  assertNoMockFallback,
  asGithubUrl,
  enforceCanaryGuards,
  getCanary,
  requireProductionMode,
  requireProductionRuntimeConfig,
} from './production.helpers';

const describeProduction =
  process.env.AGENT_MODE === 'production' ? describe : describe.skip;

describeProduction('production intents (live integrations)', () => {
  const canary = getCanary();

  beforeAll(() => {
    requireProductionMode();
    requireProductionRuntimeConfig();
    enforceCanaryGuards();
  });

  test('analyze intent returns live contributor data', async () => {
    const response = await processMessage({
      text: `analyze ${asGithubUrl(canary.analyzeRepo)}`,
      author: 'production-test-user',
      type: 'web',
    });

    assertNoMockFallback(response);
    expect(response).toContain('Analysis for');
    expect(response).toContain('Top contributors');
    expect(response).not.toContain('Analysis failed');
    expect(response).toContain('🤖 AI Analysis (verifiable)');
    expect(response).toContain('🔐 Signature:');
  });

  test('create intent uses NEAR contract path', async () => {
    const response = await processMessage({
      text: `create ${asGithubUrl(canary.createRepo)}`,
      author: 'production-test-user',
      type: 'web',
    });

    assertNoMockFallback(response);
    assertContainsAny(response, ['Split created', 'already exists']);
    expect(response).not.toContain('Failed to create split');
  });

  test('pay intent executes distribution path', async () => {
    console.log(
      `[CanaryPay] repo=${asGithubUrl(canary.payRepo)} token=${canary.payToken} amount=${canary.payAmount}`
    );

    const response = await processMessage({
      text: `pay ${canary.payAmount} ${canary.payToken} to ${asGithubUrl(canary.payRepo)}`,
      author: 'production-test-user',
      type: 'web',
    });

    assertNoMockFallback(response);
    expect(response).toContain('Paid');
    expect(response).not.toContain('Payment failed');
    assertContainsAny(response, ['Transaction:', 'intent', 'txHash']);
  });
});
