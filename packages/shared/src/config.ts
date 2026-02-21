/// <reference types="node" />

export interface RuntimeConfigValidation {
  isProduction: boolean;
  githubAuthMode: 'app' | 'token' | 'none';
  errors: string[];
  warnings: string[];
}

export interface ProductionReadiness {
  ready: boolean;
  reasons: string[];
  checks: {
    githubApp: boolean;
    near: boolean;
    pingpay: boolean;
    hotpay: boolean;
    eigenai: boolean;
  };
}

export interface CanaryConfig {
  analyzeRepo: string;
  createRepo: string;
  payRepo: string;
  payToken: string;
  payAmount: number;
  payMaxAmount: number;
  canaryRepos: string[];
}

function hasValue(value?: string): boolean {
  return !!value && value.trim().length > 0;
}

export function getWebAppBaseUrl(env: any = process.env): string {
  const raw = (env.WEB_APP_BASE_URL || 'https://gitsplits.vercel.app').trim();
  return raw.replace(/\/+$/, '');
}

export function getVerifyBaseUrl(env: any = process.env): string {
  return `${getWebAppBaseUrl(env)}/verify`;
}

export function isProductionMode(env: any = process.env): boolean {
  return env.AGENT_MODE === 'production';
}

export function hasGitHubAppAuth(env: any = process.env): boolean {
  return hasValue(env.GITHUB_APP_ID) && hasValue(env.GITHUB_PRIVATE_KEY);
}

export function hasGitHubTokenAuth(env: any = process.env): boolean {
  return hasValue(env.GITHUB_TOKEN);
}

export function getGitHubAuthMode(
  env: any = process.env
): 'app' | 'token' | 'none' {
  if (hasGitHubAppAuth(env)) return 'app';
  if (hasGitHubTokenAuth(env)) return 'token';
  return 'none';
}

export function validateRuntimeConfig(
  env: any = process.env
): RuntimeConfigValidation {
  const isProduction = isProductionMode(env);
  const errors: string[] = [];
  const warnings: string[] = [];
  const githubAuthMode = getGitHubAuthMode(env);

  if (isProduction && githubAuthMode !== 'app') {
    errors.push(
      'GitHub App auth is required in production (set GITHUB_APP_ID and GITHUB_PRIVATE_KEY).'
    );
  }

  if (isProduction && !hasValue(env.NEAR_ACCOUNT_ID)) {
    errors.push('NEAR_ACCOUNT_ID is required in production.');
  }
  if (isProduction && !hasValue(env.NEAR_PRIVATE_KEY)) {
    errors.push('NEAR_PRIVATE_KEY is required in production.');
  }
  if (isProduction && !hasValue(env.NEAR_CONTRACT_ID)) {
    errors.push('NEAR_CONTRACT_ID is required in production.');
  }
  if (isProduction && !hasValue(env.PING_PAY_API_KEY)) {
    errors.push('PING_PAY_API_KEY is required in production.');
  }
  if (isProduction && !hasValue(env.HOT_PAY_JWT)) {
    errors.push('HOT_PAY_JWT is required in production.');
  }
  if (isProduction && !hasValue(env.EIGENAI_WALLET_PRIVATE_KEY)) {
    errors.push('EIGENAI_WALLET_PRIVATE_KEY is required in production.');
  }
  if (isProduction && !hasValue(env.EIGENAI_WALLET_ADDRESS)) {
    errors.push('EIGENAI_WALLET_ADDRESS is required in production.');
  }

  if (!isProduction && githubAuthMode === 'none') {
    warnings.push('GitHub auth is not configured; rate limits may be low.');
  }

  return {
    isProduction,
    githubAuthMode,
    errors,
    warnings,
  };
}

export function validateProductionReadiness(
  env: any = process.env
): ProductionReadiness {
  const checks = {
    githubApp: hasGitHubAppAuth(env),
    near:
      hasValue(env.NEAR_ACCOUNT_ID) &&
      hasValue(env.NEAR_PRIVATE_KEY) &&
      hasValue(env.NEAR_CONTRACT_ID),
    pingpay: hasValue(env.PING_PAY_API_KEY),
    hotpay: hasValue(env.HOT_PAY_JWT),
    eigenai:
      hasValue(env.EIGENAI_WALLET_PRIVATE_KEY) &&
      hasValue(env.EIGENAI_WALLET_ADDRESS),
  };

  const reasons: string[] = [];
  if (!checks.githubApp) {
    reasons.push(
      'GitHub App auth unavailable (require GITHUB_APP_ID + GITHUB_PRIVATE_KEY).'
    );
  }
  if (!checks.near) {
    reasons.push(
      'NEAR configuration incomplete (require NEAR_ACCOUNT_ID + NEAR_PRIVATE_KEY + NEAR_CONTRACT_ID).'
    );
  }
  if (!checks.pingpay) {
    reasons.push('PING_PAY_API_KEY missing.');
  }
  if (!checks.hotpay) {
    reasons.push('HOT_PAY_JWT missing.');
  }
  if (!checks.eigenai) {
    reasons.push(
      'EigenAI grant credentials incomplete (require EIGENAI_WALLET_PRIVATE_KEY + EIGENAI_WALLET_ADDRESS).'
    );
  }

  return {
    ready: checks.githubApp && checks.near && checks.pingpay && checks.hotpay && checks.eigenai,
    reasons,
    checks,
  };
}

function normalizeRepo(repo: string): string {
  const cleaned = repo
    .replace(/^(https?:\/\/)?(www\.)?github\.com\//, '')
    .replace(/\/$/, '')
    .trim()
    .toLowerCase();
  return `github.com/${cleaned}`;
}

export function getCanaryConfig(
  env: any = process.env
): CanaryConfig {
  const analyzeRepo = env.TEST_ANALYZE_REPO || 'near/near-sdk-rs';
  const createRepo = env.TEST_CREATE_REPO || analyzeRepo;
  const payRepo = env.TEST_PAY_REPO || createRepo;
  const payToken = (env.TEST_PAY_TOKEN || 'USDC').toUpperCase();
  const payAmount = Number(env.TEST_PAY_AMOUNT || '1');
  const payMaxAmount = Number(env.TEST_PAY_MAX_AMOUNT || '1');
  const explicitCanaryRepos = (env.TEST_CANARY_REPOS || '')
    .split(',')
    .map((entry: string) => entry.trim())
    .filter(Boolean);

  const canaryRepos = explicitCanaryRepos.length
    ? explicitCanaryRepos.map(normalizeRepo)
    : [normalizeRepo(payRepo)];

  return {
    analyzeRepo,
    createRepo,
    payRepo,
    payToken,
    payAmount,
    payMaxAmount,
    canaryRepos,
  };
}

export function assertCanaryPaymentGuards(
  env: any = process.env
): void {
  const canary = getCanaryConfig(env);
  if (Number.isNaN(canary.payAmount) || canary.payAmount <= 0) {
    throw new Error('TEST_PAY_AMOUNT must be a positive number.');
  }
  if (Number.isNaN(canary.payMaxAmount) || canary.payMaxAmount <= 0) {
    throw new Error('TEST_PAY_MAX_AMOUNT must be a positive number.');
  }
  if (canary.payAmount > canary.payMaxAmount) {
    throw new Error(
      `TEST_PAY_AMOUNT (${canary.payAmount}) exceeds TEST_PAY_MAX_AMOUNT (${canary.payMaxAmount}).`
    );
  }

  const normalizedPayRepo = normalizeRepo(canary.payRepo);
  if (!canary.canaryRepos.includes(normalizedPayRepo)) {
    throw new Error(
      `TEST_PAY_REPO (${normalizedPayRepo}) is not in TEST_CANARY_REPOS (${canary.canaryRepos.join(', ')}).`
    );
  }
}
