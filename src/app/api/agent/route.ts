/**
 * Agent API Route
 *
 * Hybrid routing proxy:
 * Forwards requests to the Sovereign Controller (Brain) on Phala.
 */

import { NextRequest, NextResponse } from "next/server";

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
  if (error instanceof Error && error.name === "AbortError") {
    return `Agent request timed out after ${REQUEST_TIMEOUT_MS}ms`;
  }
  if (error instanceof Error) return error.message;
  return "Internal server error";
}

function getAgentApiHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (process.env.AGENT_API_KEY) {
    headers["x-agent-api-key"] = process.env.AGENT_API_KEY;
  }
  return headers;
}

function responseCacheKey(input: {
  text: string;
  userId: string;
  nearAccountId?: string;
  evmAddress?: string;
}): string {
  return [
    input.text.trim().toLowerCase(),
    input.userId,
    input.nearAccountId || "",
    input.evmAddress || "",
  ].join("|");
}

async function probeReady(baseUrl: string): Promise<ReadinessCacheEntry> {
  const cached = readinessCache.get(baseUrl);
  if (cached && Date.now() - cached.at < READY_CACHE_TTL_MS) {
    return cached;
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    Math.min(REQUEST_TIMEOUT_MS, 8_000),
  );
  try {
    const upstream = await fetch(`${baseUrl}/ready`, {
      method: "GET",
      cache: "no-store",
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
}): Promise<{
  ok: boolean;
  status: number;
  response?: string;
  error?: string;
}> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const upstream = await fetch(`${args.baseUrl}/process`, {
      method: "POST",
      headers: getAgentApiHeaders(),
      body: JSON.stringify({
        text: `@gitsplits ${args.text}`,
        author: args.userId,
        type: "web",
        walletAddress: args.walletAddress,
        nearAccountId: args.nearAccountId,
        evmAddress: args.evmAddress,
      }),
      signal: controller.signal,
    });

    const contentType = upstream.headers.get("content-type") || "";
    const payload = contentType.includes("application/json")
      ? await upstream.json().catch(() => ({}))
      : { response: await upstream.text().catch(() => "") };

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
      status: error instanceof Error && error.name === "AbortError" ? 504 : 503,
      error: getAbortMessage(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function planeOrder(
  preferred: AgentPlane,
  allowFallback: boolean,
): AgentPlane[] {
  if (!allowFallback) return [preferred];
  return preferred === "eigen" ? ["eigen", "hetzner"] : ["hetzner", "eigen"];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      text,
      message,
      userId = "web_user",
      walletAddress,
      nearAccountId,
      evmAddress,
    } = body;

    const userText = String(text ?? message ?? "").trim();

    if (!userText) {
      return NextResponse.json(
        { error: "Missing text/message parameter" },
        { status: 400 },
      );
    }

    // Web-first safety: pay execution must happen from /splits wallet flow.
    if (/^\s*@?gitsplits\s+pay\b|^\s*pay\b/i.test(userText)) {
      return NextResponse.json(
        {
          error:
            "Direct wallet payouts are required in web UI. Use /splits to execute NEAR payment from your connected wallet.",
        },
        { status: 400 },
      );
    }

    const baseUrl =
      process.env.CONTROLLER_URL ||
      process.env.AGENT_BASE_URL ||
      "http://localhost:3002";

    const upstreamResult = await callAgentUpstream({
      baseUrl,
      text: userText,
      userId,
      walletAddress,
      nearAccountId,
      evmAddress,
    });

    if (!upstreamResult.ok || !upstreamResult.response) {
      return NextResponse.json(
        {
          error:
            upstreamResult.error || "Failed to contact Sovereign Controller",
        },
        { status: upstreamResult.status || 502 },
      );
    }

    return NextResponse.json({
      success: true,
      response: upstreamResult.response,
      execution: {
        plane: "phala",
        upstream: baseUrl,
      },
      source: "agent-upstream",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Agent error:", error);
    return NextResponse.json(
      { error: getAbortMessage(error) },
      {
        status:
          error instanceof Error && error.name === "AbortError" ? 504 : 500,
      },
    );
  }
}

export async function GET() {
  const baseUrl =
    process.env.CONTROLLER_URL ||
    process.env.AGENT_BASE_URL ||
    "http://localhost:3002";
  const readiness = await probeReady(baseUrl);

  return NextResponse.json(
    {
      status: readiness.ready ? "ok" : "degraded",
      service: "gitsplits-agent-proxy",
      controller: {
        configured: true,
        ready: readiness.ready,
        status: readiness.status,
        details: readiness.payload,
      },
      timestamp: new Date().toISOString(),
    },
    { status: readiness.ready ? 200 : 503 },
  );
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;
export const preferredRegion = "auto";
export const revalidate = 0;

export async function HEAD() {
  return NextResponse.json({
    status: "ok",
    service: "gitsplits-agent-proxy",
    timestamp: new Date().toISOString(),
  });
}
