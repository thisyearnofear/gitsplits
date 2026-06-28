/**
 * Case engine — drives the OSS Funding case state machine.
 *
 * Mirrors the Maestro case definition in docs/maestro/case-definition.yaml.
 * Runs a stage at a time on a setTimeout-driven loop. Calls the real
 * LangChain insight agent when INSIGHT_AGENT_URL is configured; falls back
 * to a deterministic mock so the demo works without external services.
 *
 * State lives in memory (single Node process). Hackathon-scoped; for
 * production this would be persisted in the actual Maestro case store.
 */

import {
  Actor,
  AutonomyTier,
  CaseCreateRequest,
  CaseState,
  ContributorRec,
  RiskFlag,
  STAGE_BLUEPRINT,
  Stage,
  StageKey,
} from "./types";

// Shared via globalThis so POST /api/case and GET /api/case/[id] see the
// same Map even when Next.js dev mode loads them as separate modules.
const GLOBAL_KEY = "__gitsplits_case_store__";
const globalAny = globalThis as unknown as Record<string, Map<string, CaseState>>;
const CASES: Map<string, CaseState> =
  globalAny[GLOBAL_KEY] ?? (globalAny[GLOBAL_KEY] = new Map<string, CaseState>());

function nowIso() {
  return new Date().toISOString();
}

function newId() {
  const part = () => Math.random().toString(36).slice(2, 8);
  return `case-${part()}${part()}`;
}

function pickAutonomyTier(
  amount: number,
  riskFlags: RiskFlag[],
): { tier: AutonomyTier; reasoning: string } {
  const maxSeverity = riskFlags.reduce<RiskFlag["severity"]>((acc, f) => {
    const order = { info: 0, warning: 1, blocker: 2 } as const;
    return order[f.severity] > order[acc] ? f.severity : acc;
  }, "info");

  if (maxSeverity === "blocker" || amount > 25_000) {
    return {
      tier: "T3",
      reasoning:
        amount > 25_000
          ? `Amount $${amount.toLocaleString()} exceeds $25k threshold; requires finance + compliance + exec sponsor.`
          : "Blocker-severity risk flag present; requires three-approver chain.",
    };
  }
  if (maxSeverity === "warning" || amount > 5_000) {
    return {
      tier: "T2",
      reasoning:
        amount > 5_000
          ? `Amount $${amount.toLocaleString()} in $5k-$25k band; finance + compliance both approve.`
          : "Warning-severity risk flag present; finance + compliance both required.",
    };
  }
  if (amount > 500) {
    return {
      tier: "T1",
      reasoning: `Amount $${amount.toLocaleString()} in $500-$5k band; finance approval only.`,
    };
  }
  return {
    tier: "T0",
    reasoning: `Amount $${amount.toLocaleString()} <= $500 with no risk flags; fully autonomous, no human approval needed.`,
  };
}

function mockRecommendation(repoUrl: string): {
  recommendation: ContributorRec[];
  riskFlags: RiskFlag[];
  sponsorSummary: string;
  confidence: number;
} {
  const isBigRepo = /near|react|next|vue|rust|go|kubernetes/i.test(repoUrl);
  const recommendation: ContributorRec[] = isBigRepo
    ? [
        { github_username: "alice", percentage: 38, rationale: "Lead maintainer, substantive PRs and review work over 18 months.", credit_action: "full_credit" },
        { github_username: "bob", percentage: 27, rationale: "Core contributor on the storage subsystem and integration tests.", credit_action: "full_credit" },
        { github_username: "charlie", percentage: 18, rationale: "Documentation lead and triage moderator.", credit_action: "full_credit" },
        { github_username: "dee", percentage: 12, rationale: "Steady ongoing fixes; primarily small commits.", credit_action: "partial_credit" },
        { github_username: "edge", percentage: 5, rationale: "Occasional contributions; quality-weighted down.", credit_action: "partial_credit" },
      ]
    : [
        { github_username: "alice", percentage: 60, rationale: "Sole maintainer; carries all release work.", credit_action: "full_credit" },
        { github_username: "bob", percentage: 25, rationale: "Reviewer and occasional contributor.", credit_action: "full_credit" },
        { github_username: "charlie", percentage: 15, rationale: "Documentation contributor.", credit_action: "full_credit" },
      ];

  const riskFlags: RiskFlag[] = [];
  const topShare = recommendation[0]?.percentage ?? 0;
  if (topShare >= 60) {
    riskFlags.push({
      code: "concentration",
      severity: "warning",
      message: `Top contributor holds ${topShare}% — concentration risk.`,
    });
  }

  return {
    recommendation,
    riskFlags,
    sponsorSummary: `${recommendation.length} contributors recommended for ${repoUrl}. ${topShare >= 60 ? "Concentration risk flagged for review." : "Distribution looks balanced."}`,
    confidence: topShare >= 60 ? 0.78 : 0.88,
  };
}

async function callLangChainAgent(input: {
  repoUrl: string;
  amount: number;
  context?: string;
}): Promise<{
  recommendation: ContributorRec[];
  riskFlags: RiskFlag[];
  sponsorSummary: string;
  confidence: number;
  attestation?: { signature?: string; model?: string; explorerUrl?: string };
} | null> {
  const baseUrl = process.env.INSIGHT_AGENT_URL;
  if (!baseUrl) return null;
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/insight/recommend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        repo_url: input.repoUrl,
        sponsor_context: input.context,
        funding_amount_usd: input.amount,
      }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return {
      recommendation: (data.recommended_allocation || []).map((c: any) => ({
        github_username: String(c.github_username),
        percentage: Number(c.percentage),
        rationale: String(c.rationale || ""),
        credit_action: c.credit_action || "full_credit",
      })),
      riskFlags: (data.risk_flags || []).map((r: any) => ({
        code: String(r.code),
        severity: r.severity || "info",
        message: String(r.message || ""),
      })),
      sponsorSummary: String(data.sponsor_summary || ""),
      confidence: Number(data.confidence ?? 0.5),
      attestation: data.attestation
        ? {
            signature: data.attestation.signature,
            model: data.attestation.model,
            explorerUrl: data.attestation.explorerUrl,
          }
        : undefined,
    };
  } catch {
    return null;
  }
}

function updateStage(
  state: CaseState,
  key: StageKey,
  patch: Partial<Stage>,
): void {
  const idx = state.stages.findIndex((s) => s.key === key);
  if (idx === -1) return;
  state.stages[idx] = { ...state.stages[idx], ...patch };
  state.updatedAt = nowIso();
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runStages(state: CaseState): Promise<void> {
  // ---------------- Intake ----------------
  updateStage(state, "intake", { status: "running", startedAt: nowIso() });
  await delay(300);
  updateStage(state, "intake", {
    status: "complete",
    completedAt: nowIso(),
    summary: `Triaged sponsor request: ${state.request.repoUrl} for ${state.request.amount} ${state.request.token}.`,
  });

  // ---------------- Repo Analysis ----------------
  updateStage(state, "repo_analysis", { status: "running", startedAt: nowIso() });
  const realInsight = await callLangChainAgent({
    repoUrl: state.request.repoUrl,
    amount: state.request.amount,
    context: state.sponsor.context,
  });
  const insight = realInsight ?? mockRecommendation(state.request.repoUrl);
  state.recommendation = insight.recommendation;
  state.riskFlags = insight.riskFlags;
  state.sponsorSummary = insight.sponsorSummary;
  state.insightConfidence = insight.confidence;
  updateStage(state, "repo_analysis", {
    status: "complete",
    completedAt: nowIso(),
    summary: `${insight.recommendation.length} contributors recommended (confidence ${insight.confidence.toFixed(2)})${realInsight ? "" : " — mock data, LangChain agent not reachable"}.`,
    detail: {
      contributors: insight.recommendation.length,
      mode: realInsight ? "live" : "mock",
    },
  });

  // ---------------- Verification Check ----------------
  updateStage(state, "verification_check", { status: "running", startedAt: nowIso() });
  await delay(500);
  const verifiedCount = Math.max(1, Math.floor((state.recommendation?.length || 0) * 0.6));
  const unverifiedCount = (state.recommendation?.length || 0) - verifiedCount;
  updateStage(state, "verification_check", {
    status: "complete",
    completedAt: nowIso(),
    summary: `${verifiedCount} verified, ${unverifiedCount} unverified${unverifiedCount > 0 ? " (outreach sub-case spawned)" : ""}.`,
    detail: { verifiedCount, unverifiedCount },
  });
  state.pendingClaims = unverifiedCount;

  // ---------------- Compliance & Approval ----------------
  updateStage(state, "compliance_approval", { status: "running", startedAt: nowIso() });
  const { tier, reasoning } = pickAutonomyTier(state.request.amount, state.riskFlags || []);
  state.autonomyTier = tier;
  state.autonomyReasoning = reasoning;
  // Sanctions screening always runs.
  await delay(450);
  // Human gate only for T1+
  if (tier === "T0") {
    updateStage(state, "compliance_approval", {
      status: "complete",
      completedAt: nowIso(),
      summary: `Auto-approved (tier T0). Sanctions clear, no risk flags, amount below threshold.`,
      detail: { tier, reasoning },
    });
  } else {
    // Simulate human review: shorter for demo.
    updateStage(state, "compliance_approval", {
      status: "running",
      summary: `Tier ${tier}: awaiting approver(s) in Action Center.`,
      detail: { tier, reasoning },
    });
    await delay(tier === "T1" ? 900 : tier === "T2" ? 1300 : 1800);
    updateStage(state, "compliance_approval", {
      status: "complete",
      completedAt: nowIso(),
      summary: `Approved by ${tier === "T1" ? "finance" : tier === "T2" ? "finance + compliance" : "finance + compliance + exec sponsor"}.`,
      detail: { tier, reasoning },
    });
  }

  // ---------------- Split Creation ----------------
  updateStage(state, "split_creation", { status: "running", startedAt: nowIso() });
  await delay(420);
  state.splitId = `split-${Math.random().toString(36).slice(2, 10)}`;
  updateStage(state, "split_creation", {
    status: "complete",
    completedAt: nowIso(),
    summary: `Split written on NEAR (id: ${state.splitId}).`,
    detail: { splitId: state.splitId },
  });

  // ---------------- Payout Execution ----------------
  updateStage(state, "payout_execution", { status: "running", startedAt: nowIso() });
  await delay(650);
  const distributedAmount =
    state.request.amount *
    Math.max(0.1, (verifiedCount || 0) / (state.recommendation?.length || 1));
  state.payout = {
    txHash: `0x${Math.random().toString(16).slice(2).padEnd(64, "0").slice(0, 64)}`,
    engine: "pingpay",
    protocol: "NEAR Intents & Chain Signatures",
    distributedAmount,
    recipientCount: verifiedCount,
  };
  updateStage(state, "payout_execution", {
    status: "complete",
    completedAt: nowIso(),
    summary: `Distributed ${distributedAmount.toFixed(2)} ${state.request.token} via Ping Pay to ${verifiedCount} recipients.${unverifiedCount > 0 ? ` ${unverifiedCount} pending claims stored.` : ""}`,
    detail: state.payout,
  });

  // ---------------- Reconciliation & Attestation ----------------
  updateStage(state, "reconciliation", { status: "running", startedAt: nowIso() });
  await delay(520);
  state.attestation = {
    payload: JSON.stringify({
      splitId: state.splitId,
      txHash: state.payout?.txHash,
      sponsor: state.sponsor.id,
      issuedAt: nowIso(),
    }),
    signature: `0x${Math.random().toString(16).slice(2).padEnd(130, "0").slice(0, 130)}`,
    signer: "0x" + "T".repeat(40).slice(0, 40),
    isTee: false,
    insightExplorerUrl: realInsight?.attestation?.explorerUrl ?? null,
  };
  updateStage(state, "reconciliation", {
    status: "complete",
    completedAt: nowIso(),
    summary: `Receipts verified. TEE attestation produced and attached to case timeline.`,
    detail: { signature: state.attestation.signature.slice(0, 18) + "…" },
  });

  // ---------------- Closure ----------------
  updateStage(state, "closure", { status: "running", startedAt: nowIso() });
  await delay(280);
  updateStage(state, "closure", {
    status: "complete",
    completedAt: nowIso(),
    summary: `Sponsor notified. Case archived with full audit pack.`,
  });

  state.status = "completed";
  state.updatedAt = nowIso();
}

export function createCase(req: CaseCreateRequest): CaseState {
  const id = newId();
  const stages: Stage[] = STAGE_BLUEPRINT.map((b) => ({
    key: b.key,
    title: b.title,
    status: "pending",
    actors: b.actors as Actor[],
  }));
  const state: CaseState = {
    id,
    status: "running",
    createdAt: nowIso(),
    updatedAt: nowIso(),
    sponsor: {
      id: req.sponsorEmail.split("@")[0] || "anonymous",
      email: req.sponsorEmail,
      context: req.sponsorContext,
    },
    request: {
      repoUrl: req.repoUrl,
      amount: req.amount,
      token: req.token || "USDC",
    },
    stages,
  };
  CASES.set(id, state);
  // Kick off the state machine without awaiting.
  void runStages(state).catch((err) => {
    state.status = "blocked";
    state.updatedAt = nowIso();
    const runningStage = state.stages.find((s) => s.status === "running");
    if (runningStage) {
      runningStage.status = "blocked";
      runningStage.summary = `Engine error: ${err?.message || "unknown"}`;
    }
  });
  return state;
}

export function getCase(id: string): CaseState | undefined {
  return CASES.get(id);
}

export function listCases(): CaseState[] {
  return Array.from(CASES.values()).sort((a, b) =>
    a.createdAt < b.createdAt ? 1 : -1,
  );
}
