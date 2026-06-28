import { NextRequest, NextResponse } from "next/server";
import { createCase, listCases } from "@/lib/case/engine";
import { CaseCreateRequest } from "@/lib/case/types";

function parseAmount(value: unknown): number {
  const n = typeof value === "string" ? Number(value) : (value as number);
  if (!Number.isFinite(n) || n <= 0) {
    throw Object.assign(new Error("amount must be a positive number"), { statusCode: 400 });
  }
  return n;
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const repoUrl = String(body?.repoUrl || "").trim();
    const sponsorEmail = String(body?.sponsorEmail || "demo@gitsplits.example").trim();
    const sponsorContext = body?.sponsorContext ? String(body.sponsorContext) : undefined;
    const token = body?.token ? String(body.token).toUpperCase() : "USDC";
    const amount = parseAmount(body?.amount);

    if (!repoUrl) {
      return NextResponse.json({ error: "repoUrl is required" }, { status: 400 });
    }

    const request: CaseCreateRequest = { repoUrl, sponsorEmail, sponsorContext, token, amount };
    const state = createCase(request);
    return NextResponse.json({ id: state.id, status: state.status }, { status: 201 });
  } catch (err: any) {
    const status = err?.statusCode || 500;
    return NextResponse.json({ error: err?.message || "Internal error" }, { status });
  }
}

export async function GET() {
  const cases = listCases().slice(0, 25).map((c) => ({
    id: c.id,
    status: c.status,
    repoUrl: c.request.repoUrl,
    amount: c.request.amount,
    token: c.request.token,
    autonomyTier: c.autonomyTier,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }));
  return NextResponse.json({ cases });
}
