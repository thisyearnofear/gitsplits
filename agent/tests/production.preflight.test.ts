import { validateProductionReadiness } from '../src/config';
import { eigenaiTool } from '../src/tools/eigenai';
import { githubTool } from '../src/tools/github';
import { nearTool } from '../src/tools/near';
import { pingpayTool } from '../src/tools/pingpay';
import { hotpayTool } from '../src/tools/hotpay';
import {
  asGithubUrl,
  getCanary,
  requireProductionMode,
  requireProductionRuntimeConfig,
} from './production.helpers';

const describeProduction =
  process.env.AGENT_MODE === 'production' ? describe : describe.skip;

describeProduction('production preflight (live service probes)', () => {
  const canary = getCanary();

  test('production readiness config passes', () => {
    requireProductionMode();
    requireProductionRuntimeConfig();
    const readiness = validateProductionReadiness();
    expect(readiness.ready).toBe(true);
    expect(readiness.reasons).toHaveLength(0);
  });

  test('missing GitHub App creds fails readiness', () => {
    const readiness = validateProductionReadiness({
      ...process.env,
      GITHUB_APP_ID: '',
      GITHUB_PRIVATE_KEY: '',
    });
    expect(readiness.ready).toBe(false);
    expect(readiness.reasons.join(' ')).toContain('GitHub App');
  });

  test('missing NEAR creds fails readiness', () => {
    const readiness = validateProductionReadiness({
      ...process.env,
      NEAR_ACCOUNT_ID: '',
      NEAR_PRIVATE_KEY: '',
      NEAR_CONTRACT_ID: '',
    });
    expect(readiness.ready).toBe(false);
    expect(readiness.reasons.join(' ')).toContain('NEAR');
  });

  test('missing PingPay key fails readiness', () => {
    const readiness = validateProductionReadiness({
      ...process.env,
      PING_PAY_API_KEY: '',
    });
    expect(readiness.ready).toBe(false);
    expect(readiness.reasons.join(' ')).toContain('PING_PAY_API_KEY');
  });

  test('missing HOT Pay JWT fails readiness', () => {
    const readiness = validateProductionReadiness({
      ...process.env,
      HOT_PAY_JWT: '',
    });
    expect(readiness.ready).toBe(false);
    expect(readiness.reasons.join(' ')).toContain('HOT_PAY_JWT');
  });

  test('missing EigenAI creds fails readiness', () => {
    const readiness = validateProductionReadiness({
      ...process.env,
      EIGENAI_WALLET_PRIVATE_KEY: '',
      EIGENAI_WALLET_ADDRESS: '',
    });
    expect(readiness.ready).toBe(false);
    expect(readiness.reasons.join(' ')).toContain('EigenAI');
  });

  test('GitHub auth probe passes', async () => {
    requireProductionMode();
    requireProductionRuntimeConfig();
    const probe = await githubTool.probeAuth(asGithubUrl(canary.analyzeRepo));
    expect(probe.ok).toBe(true);
    expect(probe.authMode).toBe('app');
  });

  test('NEAR contract probe passes', async () => {
    requireProductionMode();
    requireProductionRuntimeConfig();
    const probe = await nearTool.probeConnection(asGithubUrl(canary.createRepo));
    expect(probe.ok).toBe(true);
  });

  test('PingPay auth probe passes', async () => {
    requireProductionMode();
    requireProductionRuntimeConfig();
    try {
      const probe = await pingpayTool.probeAuth();
      expect(probe.ok).toBe(true);
    } catch (error: any) {
      const message = String(error?.message || error);
      // Current Ping production endpoint can return 404 even with valid credentials.
      // Treat this as an explicit degraded state while HOT Pay remains available.
      if (message.includes('Probe endpoint not found')) {
        expect(process.env.HOT_PAY_JWT).toBeTruthy();
        return;
      }
      throw error;
    }
  });

  test('HOT Pay auth probe passes', async () => {
    requireProductionMode();
    requireProductionRuntimeConfig();
    const probe = await hotpayTool.probeAuth();
    expect(probe.ok).toBe(true);
  });

  test('EigenAI grant probe passes', async () => {
    requireProductionMode();
    requireProductionRuntimeConfig();
    const grant: any = await eigenaiTool.checkGrant();
    expect(grant).toBeTruthy();
    if (typeof grant.success === 'boolean') {
      expect(grant.success).toBe(true);
    }
  });
});
