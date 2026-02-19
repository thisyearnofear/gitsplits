export type AgentPlane = 'hetzner' | 'eigen';
export type AgentRisk = 'low' | 'high';

export interface AgentRoutingPlan {
  normalizedText: string;
  intent: string;
  risk: AgentRisk;
  requireAttestation: boolean;
  cacheable: boolean;
  preferred: AgentPlane;
  allowFallback: boolean;
  fallbacks: AgentPlane[];
}

function normalizeCommandText(input: string): string {
  return String(input || '')
    .trim()
    .replace(/^@?gitsplits\s+/i, '')
    .trim();
}

function inferIntent(commandText: string): string {
  const first = commandText.split(/\s+/)[0]?.toLowerCase() || '';
  return first;
}

function isHighRiskIntent(intent: string): boolean {
  return intent === 'create' || intent === 'pay' || intent === 'approve';
}

function isCacheableIntent(intent: string): boolean {
  return intent === 'analyze' || intent === 'pending' || intent === 'reputation';
}

function boolFromEnv(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  return value === 'true';
}

export function buildAgentRoutingPlan(text: string, env: NodeJS.ProcessEnv): AgentRoutingPlan {
  const normalizedText = normalizeCommandText(text);
  const intent = inferIntent(normalizedText);
  const risk: AgentRisk = isHighRiskIntent(intent) ? 'high' : 'low';

  const requireAttestation =
    risk === 'high' && boolFromEnv(env.AGENT_REQUIRE_EIGEN_FOR_CREATE_PAY, true);

  const preferred: AgentPlane = risk === 'high' ? 'eigen' : 'hetzner';
  const allowFallback =
    risk === 'low' || boolFromEnv(env.AGENT_ALLOW_HETZNER_EXEC_FALLBACK, false);

  const fallbacks: AgentPlane[] = preferred === 'eigen' ? ['hetzner'] : ['eigen'];

  return {
    normalizedText,
    intent,
    risk,
    requireAttestation,
    cacheable: isCacheableIntent(intent),
    preferred,
    allowFallback,
    fallbacks,
  };
}

export function getAgentPlaneBaseUrls(env: NodeJS.ProcessEnv): Record<AgentPlane, string | null> {
  const normalize = (value: string | undefined) => {
    if (!value || !value.trim()) return null;
    const trimmed = value.trim().replace(/\/+$/, '');
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    if (/^(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i.test(trimmed)) {
      return `http://${trimmed}`;
    }
    return `https://${trimmed}`;
  };

  const base = normalize(env.AGENT_BASE_URL);
  return {
    hetzner: normalize(env.AGENT_HETZNER_BASE_URL) || base,
    eigen: normalize(env.AGENT_EIGEN_BASE_URL) || base,
  };
}

export function formatRoutingSummary(plan: AgentRoutingPlan): string {
  return [
    `intent=${plan.intent || 'unknown'}`,
    `risk=${plan.risk}`,
    `preferred=${plan.preferred}`,
    `attestation=${plan.requireAttestation ? 'required' : 'optional'}`,
    `fallback=${plan.allowFallback ? 'enabled' : 'disabled'}`,
  ].join(' ');
}
