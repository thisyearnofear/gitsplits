import { assertCanaryPaymentGuards, getCanaryConfig, validateRuntimeConfig } from '../src/config';

export function requireProductionMode(): void {
  if (process.env.AGENT_MODE !== 'production') {
    throw new Error(
      'These tests require AGENT_MODE=production. Set AGENT_MODE=production and rerun.'
    );
  }
}

export function requireProductionRuntimeConfig(): void {
  const validation = validateRuntimeConfig();
  if (validation.errors.length > 0) {
    throw new Error(`Invalid production config: ${validation.errors.join(' | ')}`);
  }
}

export function getCanary(): ReturnType<typeof getCanaryConfig> {
  return getCanaryConfig();
}

export function asGithubUrl(repo: string): string {
  if (repo.includes('github.com/')) return repo;
  return `github.com/${repo.replace(/^\/+/, '')}`;
}

export function enforceCanaryGuards(): void {
  assertCanaryPaymentGuards();
}

export function assertNoMockFallback(response: string): void {
  const lowered = response.toLowerCase();
  if (
    lowered.includes('mock mode') ||
    lowered.includes('mocked') ||
    lowered.includes('mock ')
  ) {
    throw new Error(`Unexpected mock fallback in response: ${response}`);
  }
}

export function assertContainsAny(response: string, markers: string[]): void {
  const found = markers.some((marker) => response.includes(marker));
  if (!found) {
    throw new Error(
      `Expected one of [${markers.join(', ')}] in response, got: ${response}`
    );
  }
}
