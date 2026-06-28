"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, AlertTriangle, Loader2 } from "lucide-react";
import ConsoleHeader from "@/components/shared/ConsoleHeader";
import CaseTimeline from "@/components/case/CaseTimeline";
import type { CaseState, AutonomyTier } from "@/lib/case/types";

const TIER_META: Record<AutonomyTier, { label: string; tint: string }> = {
  T0: { label: "fully autonomous", tint: "text-[#b9ff66] border-[#b9ff66]/40" },
  T1: { label: "finance only", tint: "text-[#7fc8ff] border-[#7fc8ff]/40" },
  T2: { label: "finance + compliance", tint: "text-[#f5a524] border-[#f5a524]/40" },
  T3: { label: "finance + compliance + exec", tint: "text-[#ff5c5c] border-[#ff5c5c]/40" },
};

function TierBadge({ tier }: { tier?: AutonomyTier }) {
  if (!tier) {
    return (
      <span className="mono text-[11px] tracking-wider px-2 py-1 border border-[var(--c-line)] ink-faint">
        TIER · PENDING
      </span>
    );
  }
  const m = TIER_META[tier];
  return (
    <span className={`mono text-[11px] tracking-wider px-2 py-1 border ${m.tint}`}>
      {tier} · {m.label.toUpperCase()}
    </span>
  );
}

export default function CasePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [state, setState] = useState<CaseState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    async function tick() {
      try {
        const res = await fetch(`/api/case/${id}`, { cache: "no-store" });
        if (!res.ok) {
          if (res.status === 404) {
            setError("Case not found. It may have been cleared on a server restart.");
            return;
          }
          throw new Error(`HTTP ${res.status}`);
        }
        const data = (await res.json()) as CaseState;
        if (cancelled) return;
        setState(data);
        if (data.status === "running") timer = setTimeout(tick, 500);
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Failed to load case");
      }
    }
    tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [id]);

  if (error) {
    return (
      <div className="console min-h-screen">
        <ConsoleHeader />
        <main className="max-w-5xl mx-auto px-6 pt-16">
          <div className="panel panel-soft p-6 border-[#ff5c5c]/40">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[#ff5c5c] mt-0.5" />
              <div>
                <p className="font-medium">{error}</p>
                <Link href="/sponsor" className="inline-flex items-center gap-1 accent text-sm mt-3 hover:underline">
                  <ArrowLeft className="w-3.5 h-3.5" /> submit a new request
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="console min-h-screen">
        <ConsoleHeader />
        <main className="max-w-5xl mx-auto px-6 pt-16">
          <div className="flex items-center gap-2 ink-soft">
            <Loader2 className="w-4 h-4 animate-spin" /> loading case…
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="console min-h-screen relative">
      <div className="absolute inset-0 console-vignette pointer-events-none" />
      <ConsoleHeader />

      <main className="max-w-5xl mx-auto px-6 pt-10 pb-24 relative">
        {/* Breadcrumb / id */}
        <div className="mono text-[11px] tracking-wider ink-faint mb-6 flex flex-wrap items-center gap-2">
          <Link href="/orchestration" className="hover:text-[var(--c-ink)]">ORCH</Link>
          <span>/</span>
          <Link href="/sponsor" className="hover:text-[var(--c-ink)]">SPONSOR</Link>
          <span>/</span>
          <span className="text-[var(--c-ink-soft)]">{state.id}</span>
        </div>

        {/* Hero header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 mb-8 stagger">
          <div>
            <div className="label mb-3">case · {state.status}</div>
            <h1 className="display text-5xl md:text-6xl mb-2">
              {state.request.repoUrl}
            </h1>
            <p className="ink-soft text-sm">
              <span className="num">{state.request.amount.toLocaleString()}</span>
              {" "}
              <span className="mono">{state.request.token}</span>
              <span className="ink-faint mx-2">·</span>
              from {state.sponsor.email}
            </p>
          </div>
          <div className="flex flex-col items-start md:items-end gap-2">
            <TierBadge tier={state.autonomyTier} />
            <span className="micro flex items-center gap-1.5">
              {state.status === "running" && <span className="live-dot pulse" />}
              status · {state.status}
            </span>
          </div>
        </div>

        {/* Routing decision rail */}
        {state.autonomyReasoning && (
          <div className="panel panel-soft px-5 py-3 mb-10 flex items-start gap-4">
            <span className="label shrink-0 pt-0.5">routing</span>
            <p className="text-[13.5px] ink-soft leading-relaxed">
              {state.autonomyReasoning}
            </p>
          </div>
        )}

        {/* Timeline + side metrics */}
        <div className="grid lg:grid-cols-[1fr_280px] gap-x-12 gap-y-8">
          <section>
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="label">stage_timeline</h2>
              {state.status === "running" && (
                <span className="micro accent flex items-center gap-1.5">
                  <span className="live-dot" /> live
                </span>
              )}
            </div>
            <CaseTimeline state={state} />
          </section>

          <aside className="space-y-8 lg:pl-6 lg:border-l lg:border-[var(--c-line)]">
            {state.recommendation && state.recommendation.length > 0 && (
              <div>
                <div className="label mb-3">recommendation
                  {typeof state.insightConfidence === "number" && (
                    <span className="ink-faint ml-2 normal-case">· conf {state.insightConfidence.toFixed(2)}</span>
                  )}
                </div>
                <ul className="space-y-1.5">
                  {state.recommendation.map((c) => (
                    <li key={c.github_username} className="flex items-center justify-between text-[13px]">
                      <span className="mono">@{c.github_username}</span>
                      <span className="num ink-soft">{c.percentage}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {state.riskFlags && state.riskFlags.length > 0 && (
              <div>
                <div className="label mb-3 text-[#f5a524]">risk_flags</div>
                <div className="space-y-2.5">
                  {state.riskFlags.map((f, i) => (
                    <div key={i}>
                      <div className="micro" style={{ color: f.severity === "blocker" ? "var(--c-danger)" : f.severity === "warning" ? "var(--c-warn)" : "var(--c-ink-soft)" }}>
                        {f.severity} · {f.code}
                      </div>
                      <p className="text-[12.5px] ink-soft mt-0.5">{f.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {state.payout && (
              <div>
                <div className="label mb-3">payout</div>
                <dl className="space-y-2 text-[12.5px]">
                  <div>
                    <dt className="micro">distributed</dt>
                    <dd className="num">{state.payout.distributedAmount.toFixed(2)} {state.request.token} → {state.payout.recipientCount} recipients</dd>
                  </div>
                  <div>
                    <dt className="micro">engine</dt>
                    <dd className="mono ink-soft">{state.payout.engine} · {state.payout.protocol}</dd>
                  </div>
                  <div>
                    <dt className="micro">tx</dt>
                    <dd className="mono text-[10.5px] ink-soft break-all">{state.payout.txHash}</dd>
                  </div>
                  {state.pendingClaims && state.pendingClaims > 0 ? (
                    <div className="ink-faint text-[12px] pt-1">
                      {state.pendingClaims} pending claim(s) stored for unverified contributors
                    </div>
                  ) : null}
                </dl>
              </div>
            )}

            {state.attestation && (
              <div>
                <div className="label mb-3 accent">tee_attestation</div>
                <dl className="space-y-2 text-[12.5px]">
                  <div>
                    <dt className="micro">signer</dt>
                    <dd className="mono text-[10.5px]">{state.attestation.signer}</dd>
                  </div>
                  <div>
                    <dt className="micro">signature</dt>
                    <dd className="mono text-[10.5px] ink-soft break-all">{state.attestation.signature.slice(0, 48)}…</dd>
                  </div>
                  {state.attestation.insightExplorerUrl && (
                    <Link href={state.attestation.insightExplorerUrl} target="_blank" className="accent text-[12px] hover:underline inline-flex items-center gap-1">
                      eigenai explorer →
                    </Link>
                  )}
                </dl>
              </div>
            )}
          </aside>
        </div>

        <div className="mt-16 pt-6 border-t border-[var(--c-line)] flex flex-wrap items-center justify-between gap-3">
          <Link href="/sponsor" className="text-[13px] hover:accent inline-flex items-center gap-1.5">
            <ArrowLeft className="w-3.5 h-3.5" /> submit another request
          </Link>
          <Link href="/orchestration" className="text-[13px] ink-soft hover:text-[var(--c-ink)]">
            ← orchestration overview
          </Link>
        </div>
      </main>
    </div>
  );
}
