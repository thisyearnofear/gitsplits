/**
 * Agent API Route
 * 
 * HTTP proxy interface to the standalone GitSplits agent service.
 */

import { NextRequest, NextResponse } from 'next/server';

const REQUEST_TIMEOUT_MS = 25_000;

function getAgentBaseUrl(): string | null {
  const value = process.env.AGENT_BASE_URL?.trim();
  if (!value) return null;
  return value.replace(/\/+$/, '');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      text,
      userId = 'web_user',
      walletAddress,
      nearAccountId,
      evmAddress,
    } = body;

    if (!text) {
      return NextResponse.json(
        { error: 'Missing text parameter' },
        { status: 400 }
      );
    }

    const agentBaseUrl = getAgentBaseUrl();
    if (!agentBaseUrl) {
      return NextResponse.json(
        { error: 'AGENT_BASE_URL is not configured on the web server' },
        { status: 503 }
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (process.env.AGENT_API_KEY) {
      headers['x-agent-api-key'] = process.env.AGENT_API_KEY;
    }

    const upstream = await fetch(`${agentBaseUrl}/process`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        text: `@gitsplits ${text}`,
        author: userId,
        type: 'web',
        walletAddress,
        nearAccountId,
        evmAddress,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const payload = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      return NextResponse.json(
        {
          error:
            payload?.error ||
            `Agent upstream error (${upstream.status} ${upstream.statusText})`,
        },
        { status: upstream.status }
      );
    }

    return NextResponse.json({
      success: true,
      response: payload?.response ?? payload,
      source: 'agent-upstream',
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    const message =
      error?.name === 'AbortError'
        ? `Agent request timed out after ${REQUEST_TIMEOUT_MS}ms`
        : error?.message || 'Internal server error';
    console.error('Agent error:', error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

// Health check
export async function GET() {
  const agentBaseUrl = getAgentBaseUrl();
  if (!agentBaseUrl) {
    return NextResponse.json(
      {
        status: 'degraded',
        service: 'gitsplits-agent-proxy',
        reason: 'AGENT_BASE_URL missing',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }

  try {
    const upstream = await fetch(`${agentBaseUrl}/ready`, {
      method: 'GET',
      cache: 'no-store',
    });
    const payload = await upstream.json().catch(() => ({}));
    return NextResponse.json(
      {
        status: upstream.ok ? 'ok' : 'degraded',
        service: 'gitsplits-agent-proxy',
        upstream: agentBaseUrl,
        upstreamStatus: upstream.status,
        readiness: payload,
        timestamp: new Date().toISOString(),
      },
      { status: upstream.ok ? 200 : 503 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'degraded',
        service: 'gitsplits-agent-proxy',
        upstream: agentBaseUrl,
        reason: error?.message || 'Failed to reach agent upstream',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }

}

export const runtime = 'nodejs';

export const dynamic = 'force-dynamic';

export const maxDuration = 30;

export const preferredRegion = 'auto';

// Keep route dynamic and uncached since it proxies live agent responses.
export const revalidate = 0;

// Legacy health check shape is preserved through additional fields above.
export async function HEAD() {
  return NextResponse.json({
    status: 'ok',
    service: 'gitsplits-agent-proxy',
    timestamp: new Date().toISOString(),
  });
}
