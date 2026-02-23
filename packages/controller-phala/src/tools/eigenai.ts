/**
 * EigenAI Tool
 *
 * Provides verifiable LLM inference via EigenAI's deTERMinal grant API.
 * Uses wallet signing for authentication and returns cryptographic signatures
 * alongside completions for on-chain verification.
 */

import { privateKeyToAccount } from 'viem/accounts';
import { isProductionMode, ContributorQuality } from '@gitsplits/shared';

const DETERMINAL_API = 'https://determinal-api.eigenarcade.com';
const DEFAULT_MODEL = 'gpt-oss-120b-f16';
const DEFAULT_SEED = 42;

interface ChatMessage {
  role: string;
  content: string;
}

interface ChatOptions {
  seed?: number;
  max_tokens?: number;
  temperature?: number;
}

interface ChatCompletionResponse {
  choices?: Array<{ message: { role: string; content: string } }>;
  model?: string;
  signature?: string;
  mock?: boolean;
  [key: string]: any;
}

interface GrantAuth {
  grantMessage: string;
  grantSignature: string;
  walletAddress: string;
}

export function sanitizeEigenAiContent(content: string): string {
  if (!content) return '';

  // Some model providers prepend hidden reasoning blocks like:
  // <|channel|>analysis<|message|>...<|end|>Final answer
  const lastEnd = content.lastIndexOf('<|end|>');
  let sanitized = lastEnd >= 0 ? content.slice(lastEnd + '<|end|>'.length) : content;

  // Strip composite channel+message wrappers first.
  sanitized = sanitized.replace(/<\|channel\|>[^<]*<\|message\|>/g, '');

  // Strip any remaining control tokens.
  sanitized = sanitized.replace(/<\|[^|]+?\|>/g, '').trim();

  return sanitized || content.trim();
}

function looksLikeInternalReasoning(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return false;

  return (
    normalized.startsWith('we need to ') ||
    normalized.startsWith("let's ") ||
    normalized.startsWith('i need to ') ||
    normalized.startsWith('the user ') ||
    normalized.includes('chain-of-thought')
  );
}

function isLowSignalOutput(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return true;
  if (normalized === 'assistant' || normalized === 'final' || normalized === 'assistantfinal') return true;
  return normalized.length < 24;
}

/**
 * Attempt to repair truncated JSON from LLM responses (max_tokens cutoff).
 * Balances unmatched brackets, braces, and quotes.
 */
function repairTruncatedJson(json: string): string {
  let s = json.trim();
  // Strip trailing comma before we close brackets
  s = s.replace(/,\s*$/, '');
  const openBrackets = (s.match(/\[/g) || []).length - (s.match(/\]/g) || []).length;
  const openBraces = (s.match(/\{/g) || []).length - (s.match(/\}/g) || []).length;
  const openQuotes = (s.match(/"/g) || []).length;
  if (openQuotes % 2 !== 0) s += '"';
  for (let i = 0; i < openBraces; i++) s += '}';
  for (let i = 0; i < openBrackets; i++) s += ']';
  return s;
}

function buildSafeFallbackInsight(
  contributors: Array<{ username: string; commits: number }>
): string {
  const total = contributors.reduce((sum, c) => sum + c.commits, 0);
  const top3 = contributors.slice(0, 3).reduce((sum, c) => sum + c.commits, 0);
  const concentration = total > 0 ? Math.round((top3 / total) * 100) : 0;
  return (
    `Top contributors account for about ${concentration}% of commits among the sampled set. ` +
    'Commit count suggests concentration, but final payout weights should also consider review load, ' +
    'maintenance work, and architectural impact.'
  );
}

// Cached grant auth so we don't re-sign every request
let cachedAuth: GrantAuth | null = null;

async function getGrantAuth(): Promise<GrantAuth> {
  if (cachedAuth) return cachedAuth;

  const privateKey = process.env.EIGENAI_WALLET_PRIVATE_KEY;
  const walletAddress = process.env.EIGENAI_WALLET_ADDRESS;

  if (!privateKey || !walletAddress) {
    throw new Error('[EigenAI] EIGENAI_WALLET_PRIVATE_KEY and EIGENAI_WALLET_ADDRESS must be set');
  }

  // Step 1: Get message to sign
  console.log('[EigenAI] Fetching grant message for', walletAddress);
  const msgResponse = await fetch(`${DETERMINAL_API}/message?address=${walletAddress}`);
  if (!msgResponse.ok) {
    throw new Error(`[EigenAI] Failed to fetch grant message: ${msgResponse.statusText}`);
  }
  const msgData = await msgResponse.json() as { success: boolean; message: string };
  if (!msgData.success) {
    throw new Error('[EigenAI] Grant message request failed');
  }
  const grantMessage = msgData.message;

  // Step 2: Sign the message with the wallet
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const grantSignature = await account.signMessage({ message: grantMessage });

  console.log('[EigenAI] Grant message signed successfully');

  cachedAuth = { grantMessage, grantSignature, walletAddress };
  return cachedAuth;
}

function isMockMode(): boolean {
  return (
    !isProductionMode() &&
    (!process.env.EIGENAI_WALLET_PRIVATE_KEY || !process.env.EIGENAI_WALLET_ADDRESS)
  );
}

export const eigenaiTool = {
  name: 'eigenai',

  /**
   * Make a chat completion call via EigenAI's deTERMinal grant API.
   * Returns the full response including the signature field for verification.
   */
  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatCompletionResponse> {
    if (
      isProductionMode() &&
      (!process.env.EIGENAI_WALLET_PRIVATE_KEY || !process.env.EIGENAI_WALLET_ADDRESS)
    ) {
      throw new Error(
        '[EigenAI] Missing EIGENAI_WALLET_PRIVATE_KEY or EIGENAI_WALLET_ADDRESS in production mode'
      );
    }

    if (isMockMode()) {
      console.log('[EigenAI] Mock mode - no API call made');
      return {
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'This is a mock EigenAI response. Set EIGENAI_WALLET_PRIVATE_KEY to enable real inference.',
            },
          },
        ],
        model: DEFAULT_MODEL,
        signature: '0xmocksignature',
        mock: true,
      };
    }

    const auth = await getGrantAuth();

    const body = {
      model: DEFAULT_MODEL,
      messages,
      seed: options?.seed ?? DEFAULT_SEED,
      max_tokens: options?.max_tokens,
      temperature: options?.temperature,
      grantMessage: auth.grantMessage,
      grantSignature: auth.grantSignature,
      walletAddress: auth.walletAddress,
    };

    console.log('[EigenAI] Sending chat completion request');
    const response = await fetch(`${DETERMINAL_API}/api/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`[EigenAI] Chat completion failed: ${error}`);
    }

    const result = await response.json() as ChatCompletionResponse;
    console.log('[EigenAI] Chat completion received, signature:', result.signature ? 'present' : 'missing');
    return result;
  },

  /**
   * Use EigenAI to produce a verifiable analysis of contribution fairness.
   * Uses a Generate → Critique → Refine reflection pattern:
   *   1. Generate: Initial fairness analysis of the contribution split
   *   2. Critique & Refine: Second pass that challenges the draft for gaming patterns,
   *      bot inflation, and overlooked factors — producing a final refined assessment
   *
   * Returns the LLM analysis text and the cryptographic signature from the final call.
   */
  async analyzeContributions(
    repoUrl: string,
    contributors: Array<{ username: string; commits: number; percentage: number }>,
  ) {
    const contributorList = contributors
      .map((c) => `- ${c.username}: ${c.commits} commits (${c.percentage}%)`)
      .join('\n');

    // Step 1: Generate — initial fairness analysis (temperature 0.3 for creative breadth)
    const generateMessages: ChatMessage[] = [
      {
        role: 'system',
        content:
          'You are a fair and objective analyst of open source contributions. ' +
          'Assess the contribution percentages and suggest adjustments if needed. ' +
          'Return only a concise user-facing summary. Do not output chain-of-thought, ' +
          'internal reasoning, scratch work, or hidden analysis.',
      },
      {
        role: 'user',
        content:
          `Analyze the following contribution breakdown for the repository ${repoUrl}:\n\n` +
          `${contributorList}\n\n` +
          'Are these percentages fair based on the commit distribution? ' +
          'Suggest any adjustments and explain your reasoning.',
      },
    ];

    const draftResult = await eigenaiTool.chat(generateMessages, { temperature: 0.3 });
    const rawDraft = draftResult.choices?.[0]?.message?.content ?? '';
    const sanitizedDraft = sanitizeEigenAiContent(rawDraft);

    if (draftResult.mock || looksLikeInternalReasoning(sanitizedDraft) || isLowSignalOutput(sanitizedDraft)) {
      return {
        analysis: draftResult.mock ? sanitizedDraft : buildSafeFallbackInsight(contributors),
        signature: draftResult.signature,
        model: draftResult.model,
        repoUrl,
        contributors,
        mock: draftResult.mock ?? false,
        explorerUrl: draftResult.signature ? `https://determinal.eigenarcade.com/verify/${draftResult.signature}` : null,
      };
    }

    // Step 2: Critique & Refine — challenge the draft and produce quality scores (temperature 0.2)
    let refinedAnalysis = sanitizedDraft;
    let finalSignature = draftResult.signature;
    let qualityScores: ContributorQuality[] | undefined;
    try {
      const usernames = contributors.map((c) => c.username).join(', ');
      const critiqueMessages: ChatMessage[] = [
        {
          role: 'system',
          content:
            'You are a critical reviewer of open source contribution analyses. ' +
            'Given a contribution breakdown and a draft analysis, identify problems: ' +
            'gaming patterns (trivial commits inflating counts), bot contributions counted as human, ' +
            'maintenance/review work undervalued vs commit counts, and concentration risks. ' +
            'Respond in two sections separated by "---SCORES---".\n\n' +
            'Section 1: A refined, concise user-facing summary incorporating your corrections. ' +
            'Do not mention that you are reviewing a draft.\n\n' +
            'Section 2: A JSON array of per-contributor quality scores. For each contributor, provide:\n' +
            '- "username": GitHub username\n' +
            '- "quality": 0.0-1.0 overall quality score\n' +
            '- "commitConfidence": 0.0-1.0 confidence that commit counts reflect genuine value\n' +
            '- "creditAction": one of "full_credit", "partial_credit", "no_credit", "flag_for_review"\n' +
            '- "reasons": array of short reason strings\n\n' +
            'Example:\n' +
            '---SCORES---\n' +
            '[{"username":"alice","quality":0.9,"commitConfidence":0.85,"creditAction":"full_credit","reasons":["Consistent, substantial commits"]}]',
        },
        {
          role: 'user',
          content:
            `Repository: ${repoUrl}\n\n` +
            `Contribution data:\n${contributorList}\n\n` +
            `Draft analysis:\n${sanitizedDraft}\n\n` +
            'Review this analysis for accuracy. Check for: ' +
            '1) Contributors with many small/trivial commits that inflate their share ' +
            '2) Bot accounts miscounted as human contributors ' +
            '3) Maintainers doing code review work that commit counts undervalue ' +
            '4) Dangerous concentration where one contributor controls too much\n\n' +
            `Score each contributor: ${usernames}`,
        },
      ];

      const refineResult = await eigenaiTool.chat(critiqueMessages, { temperature: 0.2 });
      const rawRefined = refineResult.choices?.[0]?.message?.content ?? '';
      const sanitizedRefined = sanitizeEigenAiContent(rawRefined);

      if (sanitizedRefined && !looksLikeInternalReasoning(sanitizedRefined)) {
        // Parse the two sections: text analysis and quality scores
        const scoreSplit = sanitizedRefined.split('---SCORES---');
        const textPart = (scoreSplit[0] || '').trim();
        const jsonPart = (scoreSplit[1] || '').trim();

        if (textPart) {
          refinedAnalysis = textPart;
        }

        if (jsonPart) {
          try {
            const parsed = JSON.parse(repairTruncatedJson(jsonPart));
            if (Array.isArray(parsed)) {
              qualityScores = parsed
                .filter((s: any) => s.username && typeof s.quality === 'number')
                .map((s: any) => ({
                  username: s.username,
                  quality: Math.max(0, Math.min(1, s.quality)),
                  commitConfidence: Math.max(0, Math.min(1, s.commitConfidence ?? s.quality)),
                  creditAction: ['full_credit', 'partial_credit', 'no_credit', 'flag_for_review'].includes(s.creditAction)
                    ? s.creditAction
                    : 'full_credit',
                  reasons: Array.isArray(s.reasons) ? s.reasons : [],
                }));
              console.log(`[EigenAI] Quality scores produced for ${qualityScores.length} contributors`);
            }
          } catch (parseErr: any) {
            console.log('[EigenAI] Quality score JSON parse failed, using text only:', parseErr.message);
          }
        }

        finalSignature = refineResult.signature || draftResult.signature;
        console.log('[EigenAI] Reflection complete — critique refined the draft analysis');
      }
    } catch (err: any) {
      console.log('[EigenAI] Critique step skipped, using draft:', err.message);
    }

    return {
      analysis: refinedAnalysis,
      signature: finalSignature,
      model: draftResult.model,
      repoUrl,
      contributors,
      qualityScores,
      mock: false,
      explorerUrl: finalSignature ? `https://determinal.eigenarcade.com/verify/${finalSignature}` : null,
    };
  },

  /**
   * Check remaining token balance for the configured wallet.
   */
  async checkGrant() {
    const walletAddress = process.env.EIGENAI_WALLET_ADDRESS;

    if (isProductionMode() && (!process.env.EIGENAI_WALLET_PRIVATE_KEY || !walletAddress)) {
      throw new Error(
        '[EigenAI] Missing EIGENAI_WALLET_PRIVATE_KEY or EIGENAI_WALLET_ADDRESS in production mode'
      );
    }

    if (isMockMode() || !walletAddress) {
      console.log('[EigenAI] Mock mode - returning mock grant status');
      return {
        address: walletAddress ?? '0x0000000000000000000000000000000000000000',
        balance: 100000,
        mock: true,
      };
    }

    console.log('[EigenAI] Checking grant balance for', walletAddress);
    const response = await fetch(`${DETERMINAL_API}/checkGrant?address=${walletAddress}`);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`[EigenAI] Grant check failed: ${error}`);
    }

    return await response.json();
  },
};
