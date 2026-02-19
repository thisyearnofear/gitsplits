import { PolicyDecision } from './types';
import { isProductionMode } from '../config';

const DEFAULT_ALLOWED_TOKENS = (process.env.AGENT_ALLOWED_TOKENS || 'NEAR,USDC').split(',').map((t) => t.trim().toUpperCase()).filter(Boolean);
const DEFAULT_MAX_PAYOUT = Number(process.env.AGENT_MAX_PAYOUT_AMOUNT || '250');
const REQUIRE_APPROVAL = process.env.AGENT_REQUIRE_APPROVAL === 'true';
const CANARY_ONLY_PAY = process.env.AGENT_CANARY_ONLY_PAY === 'true';

function normalizeRepo(repo: string): string {
  return String(repo || '')
    .replace(/^(https?:\/\/)?(www\.)?github\.com\//i, '')
    .replace(/\/+$/, '')
    .toLowerCase();
}

function getCanaryRepos(): string[] {
  return (process.env.TEST_CANARY_REPOS || '')
    .split(',')
    .map((entry) => normalizeRepo(entry.trim()))
    .filter(Boolean);
}

export function requiresApproval(intentName: string): boolean {
  if (!REQUIRE_APPROVAL) return false;
  return intentName === 'create' || intentName === 'pay';
}

export function evaluatePolicy(input: {
  intentName: string;
  params: Record<string, any>;
  mode: 'advisor' | 'draft' | 'execute';
}): PolicyDecision {
  const reasons: string[] = [];
  const warnings: string[] = [];

  if (input.mode === 'advisor' && (input.intentName === 'create' || input.intentName === 'pay')) {
    reasons.push('Advisor mode does not execute on-chain/payment actions.');
  }

  if (input.intentName === 'pay') {
    const token = String(input.params.token || '').toUpperCase();
    const amount = Number(input.params.amount || 0);
    const repo = normalizeRepo(String(input.params.repo || ''));

    if (!DEFAULT_ALLOWED_TOKENS.includes(token)) {
      reasons.push(`Token ${token} is not allowed by policy.`);
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      reasons.push('Pay amount must be positive.');
    } else if (amount > DEFAULT_MAX_PAYOUT) {
      reasons.push(`Pay amount ${amount} exceeds policy max ${DEFAULT_MAX_PAYOUT}.`);
    }

    if (CANARY_ONLY_PAY && isProductionMode()) {
      const canaryRepos = getCanaryRepos();
      if (canaryRepos.length === 0 || !canaryRepos.includes(repo)) {
        reasons.push(`Pay intent is restricted to canary repositories in this environment.`);
      }
    }
  }

  if (input.intentName === 'create' && isProductionMode()) {
    warnings.push('Create intent will write split state on mainnet.');
  }

  return {
    allowed: reasons.length === 0,
    reasons,
    warnings,
  };
}
