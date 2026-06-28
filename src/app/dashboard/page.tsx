"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  Loader2,
  Plus,
  AlertTriangle,
  Activity,
  Coins,
  Layers,
  Sparkles,
} from "lucide-react";
import Header from "@/components/shared/Header";
import WalletStatusBar from "@/components/shared/WalletStatusBar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AutonomyTierBadge } from "@/components/case/badges";
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

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return `${Math.max(1, Math.floor(ms / 1000))}s ago`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}

function StatusDot({ status }: { status: CaseListItem["status"] }) {
  const cls = {
    running: "bg-primary animate-pulse",
    completed: "bg-emerald-500",
    rejected: "bg-rose-500",
    blocked: "bg-amber-500",
  }[status];
  return <span className={`inline-block w-2 h-2 rounded-full ${cls}`} />;
}

export default function DashboardPage() {
  const [cases, setCases] = useState<CaseListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [agentHealth, setAgentHealth] = useState<AgentHealth>("unknown");
  const [agentReason, setAgentReason] = useState<string>("");

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
        if (!cancelled) setError(err?.message || "Failed to load cases");
      }
      timer = setTimeout(tick, 4000);
    }
    tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function probe() {
      try {
        const res = await fetch("/api/agent", { method: "GET", cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.ok && data?.status === "ok") {
          setAgentHealth("ok");
          setAgentReason("Controller ready");
        } else {
          setAgentHealth("degraded");
          setAgentReason(
            data?.reason || data?.readiness?.reasons?.join(", ") || "Agent readiness degraded",
          );
        }
      } catch (err: any) {
        if (cancelled) return;
        setAgentHealth("error");
        setAgentReason(err?.message || "Unable to reach agent");
      }
    }
    probe();
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
    list.forEach((c) => {
      if (c.autonomyTier) tierCounts[c.autonomyTier]++;
    });
    return { open, completed, blocked, disbursed, tierCounts, total: list.length };
  }, [cases]);

  const sortedCases = useMemo(() => {
    return [...(cases || [])].sort((a, b) =>
      a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0,
    );
  }, [cases]);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-b from-background to-muted/30 pb-20">
        <section className="container mx-auto px-4 pt-10 pb-6 max-w-6xl">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-1">Case Operations</h1>
              <p className="text-muted-foreground">
                Live view of every OSS Funding case across the Maestro tenant.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border ${
                  agentHealth === "ok"
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                    : agentHealth === "degraded"
                    ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
                    : agentHealth === "error"
                    ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30"
                    : "bg-muted text-muted-foreground border-border"
                }`}
                title={agentReason}
              >
                <Circle
                  className={`w-2.5 h-2.5 ${
                    agentHealth === "ok"
                      ? "fill-emerald-500 text-emerald-500"
                      : agentHealth === "degraded"
                      ? "fill-amber-500 text-amber-500"
                      : agentHealth === "error"
                      ? "fill-rose-500 text-rose-500"
                      : "fill-muted text-muted"
                  }`}
                />
                Controller {agentHealth === "unknown" ? "checking…" : agentHealth}
              </span>
              <Button asChild>
                <Link href="/sponsor">
                  <Plus className="w-4 h-4 mr-1.5" /> New funding request
                </Link>
              </Button>
            </div>
          </div>

          <WalletStatusBar />
        </section>

        <section className="container mx-auto px-4 max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            <StatCard
              icon={<Activity className="w-4 h-4 text-primary" />}
              label="Open cases"
              value={stats.open}
              hint={`${stats.total} total`}
            />
            <StatCard
              icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
              label="Completed"
              value={stats.completed}
              hint={
                stats.disbursed > 0
                  ? `~$${stats.disbursed.toLocaleString()} disbursed`
                  : "no payouts yet"
              }
            />
            <StatCard
              icon={<AlertTriangle className="w-4 h-4 text-amber-600" />}
              label="Blocked / rejected"
              value={stats.blocked}
              hint={stats.blocked === 0 ? "all clear" : "review exception lanes"}
            />
            <StatCard
              icon={<Coins className="w-4 h-4 text-foreground/60" />}
              label="Total disbursed"
              value={`$${Math.round(stats.disbursed).toLocaleString()}`}
              hint="completed cases"
            />
          </div>

          <Card className="mb-8">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" /> Cases by autonomy tier
              </CardTitle>
              <CardDescription>How many cases each tier has handled.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {(["T0", "T1", "T2", "T3"] as AutonomyTier[]).map((tier) => (
                  <div key={tier} className="rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between mb-2">
                      <AutonomyTierBadge tier={tier} size="sm" />
                      <span className="text-xl font-bold tabular-nums">
                        {stats.tierCounts[tier]}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {tier === "T0" && "Auto-approved, no humans paged"}
                      {tier === "T1" && "Finance approver only"}
                      {tier === "T2" && "Finance + compliance"}
                      {tier === "T3" && "Three-approver chain"}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="container mx-auto px-4 max-w-6xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Recent cases</h2>
            <span className="text-xs text-muted-foreground">Auto-refreshes every 4s</span>
          </div>

          {error && (
            <Card className="border-rose-500/30 mb-4">
              <CardContent className="pt-4 pb-4 text-sm text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                {error}
              </CardContent>
            </Card>
          )}

          {cases === null ? (
            <Card>
              <CardContent className="pt-6 pb-6 text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading cases…
              </CardContent>
            </Card>
          ) : sortedCases.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="pt-10 pb-10 text-center space-y-4">
                <div className="w-12 h-12 mx-auto rounded-full bg-muted flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">No cases yet</p>
                  <p className="text-sm text-muted-foreground">
                    Submit a sample funding request to see one unfold here.
                  </p>
                </div>
                <Button asChild>
                  <Link href="/sponsor">
                    <Plus className="w-4 h-4 mr-1.5" /> Open the sponsor portal
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {sortedCases.map((c, idx) => (
                <motion.div
                  key={c.id}
                  initial={false}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2, delay: idx * 0.02 }}
                >
                  <Link href={`/case/${c.id}`} className="block group">
                    <Card className="hover:border-primary/40 transition-colors">
                      <CardContent className="pt-4 pb-4">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <StatusDot status={c.status} />
                            <div className="min-w-0">
                              <div className="font-medium truncate group-hover:text-primary">
                                {c.repoUrl}
                              </div>
                              <div className="text-xs text-muted-foreground font-mono">
                                {c.id}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 md:gap-4">
                            <div className="text-sm text-muted-foreground tabular-nums">
                              {c.amount.toLocaleString()} {c.token}
                            </div>
                            <AutonomyTierBadge tier={c.autonomyTier} size="sm" />
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {relativeTime(c.updatedAt)}
                            </span>
                            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4 space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wide">
          {icon} {label}
        </div>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}
