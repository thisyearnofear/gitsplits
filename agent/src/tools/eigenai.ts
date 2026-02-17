/**
 * EigenAI Tool
 *
 * Provides verifiable LLM inference via EigenAI's deTERMinal grant API.
 * Uses wallet signing for authentication and returns cryptographic signatures
 * alongside completions for on-chain verification.
 */

import { privateKeyToAccount } from 'viem/accounts';
import { isProductionMode } from '../config';

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
   * Returns the LLM analysis text and the cryptographic signature.
   */
  async analyzeContributions(
    repoUrl: string,
    contributors: Array<{ username: string; commits: number; percentage: number }>,
  ) {
    const contributorList = contributors
      .map((c) => `- ${c.username}: ${c.commits} commits (${c.percentage}%)`)
      .join('\n');

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content:
          'You are a fair and objective analyst of open source contributions. ' +
          'Assess the contribution percentages and suggest adjustments if needed. ' +
          'Consider that commit count alone may not reflect true contribution value.',
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

    const result = await eigenaiTool.chat(messages);
    const rawAnalysis = result.choices?.[0]?.message?.content ?? '';
    const analysis = sanitizeEigenAiContent(rawAnalysis);

    return {
      analysis,
      signature: result.signature,
      model: result.model,
      repoUrl,
      contributors,
      mock: result.mock ?? false,
      explorerUrl: result.signature ? `https://determinal.eigenarcade.com/verify/${result.signature}` : null,
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
