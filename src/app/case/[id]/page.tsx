"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Coins,
  ExternalLink,
  Shield,
  Sparkles,
  Users,
  Workflow,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import Header from "@/components/shared/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import CaseTimeline from "@/components/case/CaseTimeline";
import { AutonomyTierBadge } from "@/components/case/badges";
import type { CaseState } from "@/lib/case/types";

function StatusPill({ status }: { status: CaseState["status"] }) {
  const meta = {
    running: { label: "Running", bg: "bg-primary/10 text-primary border-primary/30", icon: Loader2, spin: true },
    completed: { label: "Completed", bg: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30", icon: CheckCircle2 },
    rejected: { label: "Rejected", bg: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30", icon: AlertTriangle },
    blocked: { label: "Blocked", bg: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30", icon: AlertTriangle },
  }[status];
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border ${meta.bg}`}>
      <Icon className={`w-3.5 h-3.5 ${meta.spin ? "animate-spin" : ""}`} /> {meta.label}
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
        if (data.status === "running") {
          timer = setTimeout(tick, 1200);
        }
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
      <>
        <Header />
        <main className="container mx-auto max-w-4xl px-4 pt-16 pb-20">
          <Card className="border-rose-500/40">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-600 mt-0.5" />
                <div>
                  <p className="font-semibold">{error}</p>
                  <Button asChild variant="outline" className="mt-4">
                    <Link href="/sponsor">
                      <ArrowLeft className="w-4 h-4 mr-2" /> Submit a new request
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </>
    );
  }

  if (!state) {
    return (
      <>
        <Header />
        <main className="container mx-auto max-w-4xl px-4 pt-16">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading case…
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-b from-background to-muted/30 pb-20">
        <section className="container mx-auto px-4 pt-10 pb-6 max-w-5xl">
          <div className="flex items-center gap-2 mb-4 text-xs">
            <Link href="/orchestration" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
              <Workflow className="w-3.5 h-3.5" /> Orchestration
            </Link>
            <span className="text-muted-foreground">/</span>
            <Link href="/sponsor" className="text-muted-foreground hover:text-foreground">
              Sponsor Portal
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-foreground font-mono">{state.id}</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-2">
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-1">
                {state.request.repoUrl}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="text-muted-foreground">
                  {state.request.amount.toLocaleString()} {state.request.token}
                </span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">from {state.sponsor.email}</span>
              </div>
            </div>
            <div className="flex flex-col items-start md:items-end gap-2">
              <StatusPill status={state.status} />
              <AutonomyTierBadge tier={state.autonomyTier} size="md" />
            </div>
          </div>

          {state.autonomyReasoning && (
            <Card className="mt-4 bg-muted/30">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-primary mt-0.5" />
                  <p className="text-sm">
                    <span className="font-semibold">Approval Routing Agent decision:</span>{" "}
                    {state.autonomyReasoning}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </section>

        <section className="container mx-auto px-4 max-w-5xl grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-xl font-bold">Case Timeline</h2>
            <CaseTimeline state={state} />
          </div>

          <aside className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <Users className="w-4 h-4" /> Recommendation
                </CardTitle>
                {typeof state.insightConfidence === "number" && (
                  <CardDescription className="text-xs">
                    confidence {state.insightConfidence.toFixed(2)}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="pt-0">
                {state.recommendation && state.recommendation.length > 0 ? (
                  <ul className="space-y-1.5">
                    {state.recommendation.map((c) => (
                      <li key={c.github_username} className="flex justify-between text-sm">
                        <span className="font-medium">@{c.github_username}</span>
                        <span className="text-muted-foreground">{c.percentage}%</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">Pending repo analysis…</p>
                )}
              </CardContent>
            </Card>

            {state.riskFlags && state.riskFlags.length > 0 && (
              <Card className="border-amber-500/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" /> Risk flags
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  {state.riskFlags.map((f, i) => (
                    <div key={i} className="text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase tracking-wide text-amber-700 dark:text-amber-400">
                          {f.severity}
                        </span>
                        <code className="text-muted-foreground">{f.code}</code>
                      </div>
                      <p className="text-foreground/80 mt-0.5">{f.message}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {state.payout && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-emerald-600" /> Payout
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-1.5 text-xs">
                  <div>
                    <div className="text-muted-foreground">Distributed</div>
                    <div className="font-medium">
                      {state.payout.distributedAmount.toFixed(2)} {state.request.token} → {state.payout.recipientCount} recipients
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Engine</div>
                    <div className="font-medium">{state.payout.engine} ({state.payout.protocol})</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Tx hash</div>
                    <code className="font-mono text-[10px] break-all">{state.payout.txHash}</code>
                  </div>
                  {state.pendingClaims && state.pendingClaims > 0 ? (
                    <div className="text-muted-foreground pt-1">
                      {state.pendingClaims} pending claim(s) stored for unverified contributors.
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            )}

            {state.attestation && (
              <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-emerald-500/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-primary" /> TEE attestation
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-1.5 text-xs">
                  <div>
                    <div className="text-muted-foreground">Signer</div>
                    <code className="font-mono text-[10px]">{state.attestation.signer}</code>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Signature</div>
                    <code className="font-mono text-[10px] break-all">{state.attestation.signature.slice(0, 32)}…</code>
                  </div>
                  {state.attestation.insightExplorerUrl && (
                    <Link
                      href={state.attestation.insightExplorerUrl}
                      target="_blank"
                      className="inline-flex items-center gap-1 text-primary hover:underline text-xs pt-1"
                    >
                      EigenAI explorer <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}
                </CardContent>
              </Card>
            )}
          </aside>
        </section>

        <section className="container mx-auto px-4 max-w-5xl mt-10">
          <div className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-border">
            <Button asChild variant="outline">
              <Link href="/sponsor">
                <ArrowLeft className="w-4 h-4 mr-2" /> Submit another request
              </Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/orchestration">
                <Workflow className="w-4 h-4 mr-2" /> Back to orchestration overview
              </Link>
            </Button>
          </div>
        </section>
      </main>
    </>
  );
}
