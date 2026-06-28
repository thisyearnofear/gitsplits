"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Loader2,
  Plus,
  AlertTriangle,
} from "lucide-react";
import ConsoleHeader from "@/components/shared/ConsoleHeader";
import type { AutonomyTier } from "@/lib/case/types";

type CaseListItem = {
  id: string;
  status: "running" | "completed" | "rejected" | "blocked";
  repoUrl: string;
  amount: number;
  token: string;
  autonomyTier?: AutonomyTier;
  createdAt: string;
  updatedAt: string;
};

type AgentHealth = "ok" | "degraded" | "error" | "unknown";

const TIER_TINT: Record<AutonomyTier, string> = {
  T0: "text-[#b9ff66]",
  T1: "text-[#7fc8ff]",
  T2: "text-[#f5a524]",
  T3: "text-[#ff5c5c]",
};

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return `${Math.max(1, Math.floor(ms / 1000))}s`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h`;
  return `${Math.floor(ms / 86_400_000)}d`;
}

function StatusDot({ status }: { status: CaseListItem["status"] }) {
  if (status === "running") return <span className="live-dot pulse" />;
  const color = {
    completed: "var(--c-accent)",
    rejected:  "var(--c-danger)",
    blocked:   "var(--c-warn)",
  }[status];
  return <span className="inline-block w-2 h-2 rounded-full" style={{ background: color }} />;
}

export default function DashboardPage() {
  const [cases, setCases] = useState<CaseListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [agentHealth, setAgentHealth] = useState<AgentHealth>("unknown");

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    async function tick() {
      try {
        const res = await fetch("/api/case", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        setCases(Array.isArray(data?.cases) ? data.cases : []);
        setError(null);
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "failed to load cases");
      }
      timer = setTimeout(tick, 1800);
    }
    tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/agent", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.ok && data?.status === "ok") setAgentHealth("ok");
        else setAgentHealth("degraded");
      } catch {
        if (!cancelled) setAgentHealth("error");
      }
    })();
  }, []);

  const stats = useMemo(() => {
    const list = cases || [];
    const open = list.filter((c) => c.status === "running").length;
    const completed = list.filter((c) => c.status === "completed").length;
    const blocked = list.filter((c) => c.status === "blocked" || c.status === "rejected").length;
    const disbursed = list
      .filter((c) => c.status === "completed")
      .reduce((sum, c) => sum + Number(c.amount || 0), 0);
    const tierCounts: Record<AutonomyTier, number> = { T0: 0, T1: 0, T2: 0, T3: 0 };
    list.forEach((c) => { if (c.autonomyTier) tierCounts[c.autonomyTier]++; });
    return { open, completed, blocked, disbursed, tierCounts, total: list.length };
  }, [cases]);

  const sorted = useMemo(
    () => [...(cases || [])].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)),
    [cases],
  );

  return (
    <div className="console min-h-screen relative">
      <div className="absolute inset-0 console-vignette pointer-events-none" />
      <ConsoleHeader />

      <main className="max-w-7xl mx-auto px-6 pt-10 pb-24 relative">
        {/* Hero header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10 stagger">
          <div>
            <div className="label mb-3">case_ops · live</div>
            <h1 className="display text-5xl md:text-6xl">Case Operations</h1>
            <p className="ink-soft text-[14px] mt-2">
              Every OSS Funding case across the Maestro tenant — auto-refreshing.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="micro flex items-center gap-1.5">
              <span
                className="inline-block w-1.5 h-1.5 rounded-full"
                style={{
                  background:
                    agentHealth === "ok" ? "var(--c-accent)" :
                    agentHealth === "degraded" ? "var(--c-warn)" :
                    agentHealth === "error" ? "var(--c-danger)" : "var(--c-line-bold)",
                }}
              />
              controller · {agentHealth}
            </span>
            <Link
              href="/sponsor"
              className="inline-flex items-center gap-1.5 border border-[var(--c-accent)] accent px-3 py-1.5 mono text-[11px] tracking-wider uppercase hover:bg-[var(--c-accent)] hover:text-[var(--c-bg)] transition-colors"
            >
              <Plus className="w-3 h-3" /> new request
            </Link>
          </div>
        </div>

        {/* Aggregate metrics — bordered cells, not cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 border border-[var(--c-line)] mb-12 stagger">
          <Metric label="open" value={stats.open} hint={`${stats.total} total`} />
          <Metric label="completed" value={stats.completed} hint={stats.disbursed > 0 ? `~$${stats.disbursed.toLocaleString()} out` : "no payouts"} accent />
          <Metric label="blocked / rejected" value={stats.blocked} hint={stats.blocked === 0 ? "all clear" : "review exceptions"} warn={stats.blocked > 0} />
          <Metric label="total disbursed" value={`$${Math.round(stats.disbursed).toLocaleString()}`} hint="completed cases" />
        </div>

        {/* Tier distribution */}
        <section className="mb-14">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="label">autonomy_distribution</h2>
            <span className="ink-faint text-[11px]">tier <span className="accent">→</span> case_count</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-4">
            {(["T0", "T1", "T2", "T3"] as AutonomyTier[]).map((tier) => {
              const count = stats.tierCounts[tier];
              const pct = stats.total > 0 ? count / stats.total : 0;
              return (
                <div key={tier} className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className={`mono text-[12px] tracking-wider ${TIER_TINT[tier]}`}>{tier}</span>
                    <span className="num text-xl">{count}</span>
                  </div>
                  <div className="bar"><i style={{ width: `${Math.max(2, pct * 100)}%`, background: "currentColor", color: count > 0 ? "var(--c-accent)" : "var(--c-line-bold)" }} className="block h-full" /></div>
                  <div className="micro normal-case tracking-normal ink-faint">
                    {tier === "T0" && "auto-approved, no humans paged"}
                    {tier === "T1" && "finance approver only"}
                    {tier === "T2" && "finance + compliance"}
                    {tier === "T3" && "three-approver chain"}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Recent cases — ticker-style list */}
        <section>
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="label">recent_cases</h2>
            <span className="ink-faint text-[11px]">auto-refresh · 1.8s</span>
          </div>

          {error && (
            <div className="border border-[#ff5c5c]/40 px-3 py-2 mb-4 text-[13px] text-[#ff5c5c] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> {error}
            </div>
          )}

          {cases === null ? (
            <div className="ink-soft text-[13px] flex items-center gap-2 py-6">
              <Loader2 className="w-4 h-4 animate-spin" /> loading cases…
            </div>
          ) : sorted.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-[var(--c-line)]">
              <p className="ink-faint text-[13px] mb-3">no cases yet</p>
              <Link href="/sponsor" className="accent text-[13px] hover:underline">submit a sample → /sponsor</Link>
            </div>
          ) : (
            <ol className="divide-y divide-[var(--c-line)] border-t border-b border-[var(--c-line)]">
              {sorted.map((c, idx) => (
                <li key={c.id} className="group">
                  <Link
                    href={`/case/${c.id}`}
                    className="grid grid-cols-[24px_2fr_1fr_auto_auto_auto] items-center gap-4 py-3 hover:bg-[var(--c-bg-soft)] -mx-3 px-3 transition-colors"
                  >
                    <span className="ink-faint num text-[10.5px]">{String(idx + 1).padStart(2, "0")}</span>
                    <span className="flex items-center gap-2.5 min-w-0">
                      <StatusDot status={c.status} />
                      <span className="mono text-[13px] truncate group-hover:accent transition-colors">{c.repoUrl}</span>
                    </span>
                    <span className="mono text-[10.5px] ink-faint truncate">{c.id}</span>
                    <span className="num text-[13px] text-right">{c.amount.toLocaleString()}<span className="ink-faint mono ml-1 text-[11px]">{c.token}</span></span>
                    <span className={`mono text-[10.5px] tracking-wider ${c.autonomyTier ? TIER_TINT[c.autonomyTier] : "ink-faint"} w-10 text-right`}>{c.autonomyTier ?? "—"}</span>
                    <span className="num ink-faint text-[10.5px] w-10 text-right">{relativeTime(c.updatedAt)}</span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </section>
      </main>
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
  accent,
  warn,
}: {
  label: string;
  value: number | string;
  hint?: string;
  accent?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="px-5 py-4 border-r last:border-r-0 border-[var(--c-line)] min-h-[100px] flex flex-col justify-between">
      <div className="label">{label}</div>
      <div className={`num text-3xl ${accent ? "accent" : warn ? "text-[var(--c-warn)]" : ""}`}>{value}</div>
      {hint && <div className="ink-faint text-[11px] mono">{hint}</div>}
    </div>
  );
}
