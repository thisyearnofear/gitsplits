import { getCanaryConfig, isProductionMode } from '@gitsplits/shared';
import { githubTool } from '../tools/github';
import { nearTool } from '../tools/near';
import { pingpayTool } from '../tools/pingpay';
import { hotpayTool } from '../tools/hotpay';
import { eigenaiTool } from '../tools/eigenai';
import { logEvent } from '../agentic/telemetry';

interface CanaryResult {
  at: string;
  ok: boolean;
  checks: Record<string, { ok: boolean; details?: string }>;
}

let lastCanaryResult: CanaryResult | null = null;
let timer: NodeJS.Timeout | null = null;

function asGithubUrl(input: string): string {
  return input.startsWith('github.com/') ? input : `github.com/${input}`;
}

export async function runCanaryOnce(): Promise<CanaryResult> {
  const canary = getCanaryConfig();
  const checks: CanaryResult['checks'] = {};

  const safeCheck = async (name: string, fn: () => Promise<any>) => {
    try {
      const result = await fn();
      checks[name] = { ok: true, details: JSON.stringify(result).slice(0, 180) };
    } catch (err: any) {
      checks[name] = { ok: false, details: err?.message || String(err) };
    }
  };

  await safeCheck('github', () => githubTool.probeAuth(asGithubUrl(canary.analyzeRepo)));
  await safeCheck('near', () => nearTool.probeConnection(asGithubUrl(canary.createRepo)));
  await safeCheck('pingpay', () => pingpayTool.probeAuth());
  await safeCheck('hotpay', () => hotpayTool.probeAuth());
  await safeCheck('eigenai', () => eigenaiTool.checkGrant());

  const ok = Object.values(checks).every((check) => check.ok);
  const result: CanaryResult = {
    at: new Date().toISOString(),
    ok,
    checks,
  };

  lastCanaryResult = result;
  logEvent({ type: 'canary_run', ok, checks });
  return result;
}

export function startCanaryMonitor(): void {
  const enabled = process.env.AGENT_CANARY_MONITOR === 'true';
  if (!enabled || !isProductionMode()) return;

  if (timer) return;
  const intervalMs = Math.max(5, Number(process.env.AGENT_CANARY_INTERVAL_MINUTES || '30')) * 60 * 1000;
  timer = setInterval(() => {
    runCanaryOnce().catch((err) => {
      console.error('[Canary] run failed:', err?.message || err);
    });
  }, intervalMs);

  // Kick off first run.
  runCanaryOnce().catch((err) => {
    console.error('[Canary] initial run failed:', err?.message || err);
  });
}

export function stopCanaryMonitor(): void {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
}

export function getLastCanaryResult(): CanaryResult | null {
  return lastCanaryResult;
}
