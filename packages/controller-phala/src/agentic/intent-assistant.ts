import { eigenaiTool } from '../tools/eigenai';

export interface AssistedIntent {
  intentName: 'analyze' | 'create' | 'pay' | 'verify' | 'pending';
  params: Record<string, any>;
  confidence: number;
  outcomes: string[];
  rationale: string;
  source: 'llm' | 'heuristic';
}

function extractFirstRepo(text: string): string | null {
  const repoMatch = text.match(/(?:github\.com\/)?([a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+)/i);
  if (!repoMatch) return null;
  return `github.com/${repoMatch[1]}`;
}

function heuristicAssist(text: string): AssistedIntent | null {
  const lower = text.toLowerCase();
  const repo = extractFirstRepo(text);

  if ((lower.includes('analy') || lower.includes('contributor')) && repo) {
    return {
      intentName: 'analyze',
      params: { repo },
      confidence: 0.72,
      outcomes: ['Fetch contributor history', 'Compute verification coverage', 'Propose next split action'],
      rationale: 'Detected repository analysis intent.',
      source: 'heuristic',
    };
  }

  if ((lower.includes('create') || lower.includes('split') || lower.includes('distribution')) && repo) {
    return {
      intentName: 'create',
      params: { repo, allocation: 'default' },
      confidence: 0.69,
      outcomes: ['Create/refresh split', 'Map contributors to percentages', 'Report verification gaps'],
      rationale: 'Detected split creation intent.',
      source: 'heuristic',
    };
  }

  const payMatch = text.match(/(?:pay|send|distribute)\s+(\d+(?:\.\d+)?)\s*([a-zA-Z0-9]+)?/i);
  if (payMatch && repo) {
    return {
      intentName: 'pay',
      params: {
        amount: Number(payMatch[1]),
        token: String(payMatch[2] || 'NEAR').toUpperCase(),
        repo,
      },
      confidence: 0.7,
      outcomes: ['Validate verified recipients', 'Apply payout policy', 'Execute payment via configured engine'],
      rationale: 'Detected payment intent with amount and repository.',
      source: 'heuristic',
    };
  }

  if ((lower.includes('verify') || lower.includes('link wallet')) && (repo || lower.includes('@'))) {
    return {
      intentName: 'verify',
      params: { repo: repo || undefined },
      confidence: 0.62,
      outcomes: ['Check current verification coverage', 'Generate verification links', 'Suggest outreach artifacts'],
      rationale: 'Detected verification-related request.',
      source: 'heuristic',
    };
  }

  if (lower.includes('pending') && repo) {
    return {
      intentName: 'pending',
      params: { target: repo },
      confidence: 0.65,
      outcomes: ['Fetch pending claims by contributor', 'Summarize blocked payouts'],
      rationale: 'Detected pending claims request.',
      source: 'heuristic',
    };
  }

  return null;
}

function extractJsonBlock(text: string): any | null {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end < 0 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
}

export async function assistIntent(text: string): Promise<AssistedIntent | null> {
  if (process.env.NODE_ENV === 'test' && process.env.AGENT_TEST_USE_LLM !== 'true') {
    return heuristicAssist(text);
  }

  try {
    const result = await eigenaiTool.chat([
      {
        role: 'system',
        content:
          'Classify user requests for a GitHub contributor payout agent. Return strict JSON only with keys: intentName, params, confidence, outcomes, rationale. ' +
          'intentName must be one of: analyze, create, pay, verify, pending. ' +
          'Normalize repo to github.com/owner/repo when possible.',
      },
      {
        role: 'user',
        content: text,
      },
    ], { max_tokens: 220, temperature: 0.1 });

    const content = result.choices?.[0]?.message?.content || '';
    const parsed = extractJsonBlock(content);
    if (!parsed) {
      return heuristicAssist(text);
    }

    if (!['analyze', 'create', 'pay', 'verify', 'pending'].includes(parsed.intentName)) {
      return heuristicAssist(text);
    }

    return {
      intentName: parsed.intentName,
      params: parsed.params || {},
      confidence: Math.max(0, Math.min(1, Number(parsed.confidence || 0.5))),
      outcomes: Array.isArray(parsed.outcomes) ? parsed.outcomes.map((o: any) => String(o)) : [],
      rationale: String(parsed.rationale || 'LLM-assisted classification.'),
      source: 'llm',
    };
  } catch {
    return heuristicAssist(text);
  }
}

export function formatAssistedSuggestion(suggestion: AssistedIntent): string {
  return (
    `🤖 Hands-off intent interpretation (${suggestion.source}, confidence ${suggestion.confidence.toFixed(2)}).\n` +
    `Intent: ${suggestion.intentName}\n` +
    `Rationale: ${suggestion.rationale}\n\n` +
    `Suggested outcomes:\n${suggestion.outcomes.map((o) => `- ${o}`).join('\n')}`
  );
}
