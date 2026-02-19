import crypto from 'crypto';
import { ActionPlan } from './types';

const PLAN_TTL_MS = Number(process.env.AGENT_PLAN_TTL_MS || 10 * 60 * 1000);

export function createActionPlan(input: {
  intent: string;
  params: Record<string, any>;
  dependencies: string[];
  risks?: string[];
  outputs?: string[];
  confidence: number;
}): ActionPlan {
  const now = Date.now();
  const planHash = crypto
    .createHash('sha256')
    .update(JSON.stringify({ intent: input.intent, params: input.params, now }))
    .digest('hex')
    .slice(0, 10);

  return {
    id: `plan-${planHash}`,
    intent: input.intent,
    params: input.params,
    dependencies: input.dependencies,
    risks: input.risks || [],
    outputs: input.outputs || [],
    createdAt: now,
    expiresAt: now + PLAN_TTL_MS,
    confidence: input.confidence,
  };
}

export function formatPlanForUser(plan: ActionPlan): string {
  const payload = {
    id: plan.id,
    intent: plan.intent,
    params: plan.params,
    dependencies: plan.dependencies,
    risks: plan.risks,
    outputs: plan.outputs,
    confidence: Number(plan.confidence.toFixed(2)),
    expiresAt: new Date(plan.expiresAt).toISOString(),
  };

  return (
    `🧭 Execution plan prepared (${plan.intent}).\n\n` +
    '```json\n' +
    `${JSON.stringify(payload, null, 2)}\n` +
    '```\n\n' +
    `Reply with \"approve ${plan.id}\" to execute, or \"cancel\" to discard.`
  );
}
