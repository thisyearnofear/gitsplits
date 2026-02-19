/**
 * Agent API Route
 *
 * Hybrid routing proxy:
 * - Hetzner plane for low-risk orchestration/advisory commands
 * - Eigen plane for high-risk execution requiring TEE verification
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  AgentPlane,
  buildAgentRoutingPlan,
  formatRoutingSummary,
  getAgentPlaneBaseUrls,
} from '@/lib/agent-routing';

const REQUEST_TIMEOUT_MS = 25_000;
const READY_CACHE_TTL_MS = 15_000;
const RESPONSE_CACHE_TTL_MS = 20_000;

type ReadinessCacheEntry = {
  at: number;
  ready: boolean;
  status: number;
  payload: any;
};

type ResponseCacheEntry = {
  at: number;
  response: string;
  execution: any;
};

const readinessCache = new Map<string, ReadinessCacheEntry>();
const responseCache = new Map<string, ResponseCacheEntry>();

function getAbortMessage(error: unknown): string {
  if (error instanceof Error && error.name === 'AbortError') {
    return `Agent request timed out after ${REQUEST_TIMEOUT_MS}ms`;
  }
  if (error instanceof Error) return error.message;
  return 'Internal server error';
}

function getAgentApiHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (process.env.AGENT_API_KEY) {
    headers['x-agent-api-key'] = process.env.AGENT_API_KEY;
  }
  return headers;
}

function responseCacheKey(input: {
  text: string;
  userId: string;
  nearAccountId?: string;
  evmAddress?: string;
}): string {
  return [input.text.trim().toLowerCase(), input.userId, input.nearAccountId || '', input.evmAddress || ''].join('|');
}

async function probeReady(baseUrl: string): Promise<ReadinessCacheEntry> {
  const cached = readinessCache.get(baseUrl);
  if (cached && Date.now() - cached.at < READY_CACHE_TTL_MS) {
    return cached;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.min(REQUEST_TIMEOUT_MS, 8_000));
  try {
    const upstream = await fetch(`${baseUrl}/ready`, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    });
    const payload = await upstream.json().catch(() => ({}));
    const entry: ReadinessCacheEntry = {
      at: Date.now(),
      ready: upstream.ok && Boolean(payload?.ready ?? true),
      status: upstream.status,
      payload,
    };
    readinessCache.set(baseUrl, entry);
    return entry;
  } catch (error: any) {
    const entry: ReadinessCacheEntry = {
      at: Date.now(),
      ready: false,
      status: 503,
      payload: { error: getAbortMessage(error) },
    };
    readinessCache.set(baseUrl, entry);
    return entry;
  } finally {
    clearTimeout(timeout);
  }
}

async function callAgentUpstream(args: {
  baseUrl: string;
  text: string;
  userId: string;
  walletAddress?: string;
  nearAccountId?: string;
  evmAddress?: string;
}): Promise<{ ok: boolean; status: number; response?: string; error?: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const upstream = await fetch(`${args.baseUrl}/process`, {
      method: 'POST',
      headers: getAgentApiHeaders(),
      body: JSON.stringify({
        text: `@gitsplits ${args.text}`,
        author: args.userId,
        type: 'web',
        walletAddress: args.walletAddress,
        nearAccountId: args.nearAccountId,
        evmAddress: args.evmAddress,
      }),
      signal: controller.signal,
    });

    const contentType = upstream.headers.get('content-type') || '';
    const payload = contentType.includes('application/json')
      ? await upstream.json().catch(() => ({}))
      : { response: await upstream.text().catch(() => '') };

    if (!upstream.ok) {
      return {
        ok: false,
        status: upstream.status,
        error:
          payload?.error ||
          `Agent upstream error (${upstream.status} ${upstream.statusText})`,
      };
    }

    return {
      ok: true,
      status: upstream.status,
      response: payload?.response ?? payload,
    };
  } catch (error: any) {
    return {
      ok: false,
      status: error instanceof Error && error.name === 'AbortError' ? 504 : 503,
      error: getAbortMessage(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function planeOrder(preferred: AgentPlane, allowFallback: boolean): AgentPlane[] {
  if (!allowFallback) return [preferred];
  return preferred === 'eigen' ? ['eigen', 'hetzner'] : ['hetzner', 'eigen'];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      text,
      message,
      userId = 'web_user',
      walletAddress,
      nearAccountId,
      evmAddress,
    } = body;

    const userText = String(text ?? message ?? '').trim();

    if (!userText) {
      return NextResponse.json({ error: 'Missing text/message parameter' }, { status: 400 });
    }

    // Web-first safety: pay execution must happen from /splits wallet flow.
    if (/^\s*@?gitsplits\s+pay\b|^\s*pay\b/i.test(userText)) {
      return NextResponse.json(
        {
          error:
            'Direct wallet payouts are required in web UI. Use /splits to execute NEAR payment from your connected wallet.',
        },
        { status: 400 }
      );
    }

    const plan = buildAgentRoutingPlan(userText, process.env);
    const planeUrls = getAgentPlaneBaseUrls(process.env);

    if (!planeUrls.hetzner && !planeUrls.eigen) {
      return NextResponse.json(
        {
          error:
            'Agent upstream is not configured. Set AGENT_HETZNER_BASE_URL and/or AGENT_EIGEN_BASE_URL (or AGENT_BASE_URL).',
        },
        { status: 503 }
      );
    }

    if (plan.cacheable) {
      const key = responseCacheKey({ text: userText, userId, nearAccountId, evmAddress });
      const cached = responseCache.get(key);
      if (cached && Date.now() - cached.at < RESPONSE_CACHE_TTL_MS) {
        return NextResponse.json({
          success: true,
          response: cached.response,
          execution: {
            ...cached.execution,
            cacheHit: true,
          },
          attempts: [],
          source: 'agent-cache',
          timestamp: new Date().toISOString(),
        });
      }
    }

    const order = planeOrder(plan.preferred, plan.allowFallback);
    const attempts: Array<{
      plane: AgentPlane;
      baseUrl: string;
      ok: boolean;
      error?: string;
      status?: number;
      reason?: string;
    }> = [];

    for (const plane of order) {
      const baseUrl = planeUrls[plane];
      if (!baseUrl) continue;

      if (plan.requireAttestation && plane !== 'eigen') {
        attempts.push({
          plane,
          baseUrl,
          ok: false,
          reason: 'skipped: attestation required',
        });
        continue;
      }

      const readiness = await probeReady(baseUrl);
      if (!readiness.ready) {
        attempts.push({
          plane,
          baseUrl,
          ok: false,
          error: `not ready (${readiness.status})`,
          status: readiness.status,
          reason: 'readiness check failed',
        });
        continue;
      }

      const upstreamResult = await callAgentUpstream({
        baseUrl,
        text: userText,
        userId,
        walletAddress,
        nearAccountId,
        evmAddress,
      });

      if (!upstreamResult.ok || !upstreamResult.response) {
        const failedAttempt = {
          plane,
          baseUrl,
          ok: false,
          error: upstreamResult.error,
          status: upstreamResult.status,
          reason: 'upstream request failed',
        };
        attempts.push(failedAttempt);

        // Security: do not bypass auth failures on the preferred plane.
        // If preferred upstream rejects auth, fail-closed instead of fallback.
        if (
          plane === plan.preferred &&
          (upstreamResult.status === 401 || upstreamResult.status === 403)
        ) {
          return NextResponse.json(
            {
              error: `Preferred agent upstream rejected authorization (${upstreamResult.status}).`,
              routing: formatRoutingSummary(plan),
              attempts,
            },
            { status: 502 }
          );
        }
        continue;
      }

      attempts.push({
        plane,
        baseUrl,
        ok: true,
        status: upstreamResult.status,
        reason: 'selected',
      });

      const execution = {
        plane,
        risk: plan.risk,
        intent: plan.intent,
        requireAttestation: plan.requireAttestation,
        fallbackUsed: plane !== plan.preferred,
        routing: formatRoutingSummary(plan),
        upstream: baseUrl,
        cacheHit: false,
      };

      if (plan.cacheable) {
        const key = responseCacheKey({ text: userText, userId, nearAccountId, evmAddress });
        responseCache.set(key, {
          at: Date.now(),
          response: upstreamResult.response,
          execution,
        });
      }

      return NextResponse.json({
        success: true,
        response: upstreamResult.response,
        execution,
        attempts,
        source: 'agent-upstream',
        timestamp: new Date().toISOString(),
      });
    }

    const hardFailMessage = plan.requireAttestation
      ? 'High-risk action is blocked because Eigen (TEE) is unavailable; fail-closed policy is active.'
      : 'All configured agent upstreams are currently unavailable.';

    return NextResponse.json(
      {
        error: hardFailMessage,
        routing: formatRoutingSummary(plan),
        attempts,
      },
      { status: 503 }
    );
  } catch (error: any) {
    console.error('Agent error:', error);
    return NextResponse.json(
      { error: getAbortMessage(error) },
      { status: error instanceof Error && error.name === 'AbortError' ? 504 : 500 }
    );
  }
}

export async function GET() {
  const planeUrls = getAgentPlaneBaseUrls(process.env);

  const checks = await Promise.all(
    (Object.keys(planeUrls) as AgentPlane[]).map(async (plane) => {
      const baseUrl = planeUrls[plane];
      if (!baseUrl) {
        return {
          plane,
          configured: false,
          ready: false,
          status: 0,
          details: 'not configured',
        };
      }
      const readiness = await probeReady(baseUrl);
      return {
        plane,
        configured: true,
        ready: readiness.ready,
        status: readiness.status,
        details: readiness.payload,
      };
    })
  );

  const anyReady = checks.some((c) => c.ready);
  return NextResponse.json(
    {
      status: anyReady ? 'ok' : 'degraded',
      service: 'gitsplits-agent-proxy',
      planes: checks,
      policy: {
        requireEigenForCreatePay:
          process.env.AGENT_REQUIRE_EIGEN_FOR_CREATE_PAY !== 'false',
        allowHetznerExecFallback:
          process.env.AGENT_ALLOW_HETZNER_EXEC_FALLBACK === 'true',
      },
      timestamp: new Date().toISOString(),
    },
    { status: anyReady ? 200 : 503 }
  );
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;
export const preferredRegion = 'auto';
export const revalidate = 0;

export async function HEAD() {
  return NextResponse.json({
    status: 'ok',
    service: 'gitsplits-agent-proxy',
    timestamp: new Date().toISOString(),
  });
}
