"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Github, Loader2, Sparkles, Workflow } from "lucide-react";
import Header from "@/components/shared/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AutonomyTierBadge } from "@/components/case/badges";
import type { AutonomyTier } from "@/lib/case/types";

const SAMPLE_REPOS = [
  { repo: "near/near-sdk-rs", amount: 2500, context: "Critical dependency in our payments rail." },
  { repo: "facebook/react", amount: 250, context: "We use React across every customer-facing surface." },
  { repo: "rust-lang/rust", amount: 50000, context: "Strategic OSS investment, board-approved." },
  { repo: "vercel/next.js", amount: 1500, context: "Powers our marketing and dashboard sites." },
];

function predictTier(amount: number): AutonomyTier {
  if (amount > 25_000) return "T3";
  if (amount > 5_000) return "T2";
  if (amount > 500) return "T1";
  return "T0";
}

export default function SponsorPortalPage() {
  const router = useRouter();
  const [repoUrl, setRepoUrl] = useState("");
  const [amount, setAmount] = useState<number>(250);
  const [token, setToken] = useState("USDC");
  const [sponsorEmail, setSponsorEmail] = useState("maya@example.com");
  const [sponsorContext, setSponsorContext] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tier = predictTier(amount);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/case", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl, amount, token, sponsorEmail, sponsorContext }),
      });
      const data = await res.json();
      if (!res.ok || !data?.id) {
        throw new Error(data?.error || `Submit failed (HTTP ${res.status})`);
      }
      router.push(`/case/${data.id}`);
    } catch (err: any) {
      setError(err?.message || "Failed to create case");
      setSubmitting(false);
    }
  }

  function loadSample(s: (typeof SAMPLE_REPOS)[number]) {
    setRepoUrl(s.repo);
    setAmount(s.amount);
    setSponsorContext(s.context);
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-b from-background to-muted/30 pb-20">
        <section className="container mx-auto px-4 pt-12 pb-6 max-w-4xl">
          <div className="flex items-center gap-2 mb-4 text-xs">
            <Link href="/orchestration" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
              <Workflow className="w-3.5 h-3.5" /> Orchestration
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-foreground">Sponsor Portal</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
            Submit a funding request
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            One form opens a UiPath Maestro case. The Approval Routing Agent assigns an
            autonomy tier based on the amount and risk flags — small requests run end-to-end
            without paging a human; larger ones route to the appropriate approvers.
          </p>
        </section>

        <section className="container mx-auto px-4 max-w-4xl grid md:grid-cols-3 gap-6">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Funding request</CardTitle>
              <CardDescription>Posts to /api/case → creates a Maestro case instance.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-1.5">
                  <Label htmlFor="repo">Repository</Label>
                  <Input
                    id="repo"
                    placeholder="owner/repo or github.com/owner/repo"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 space-y-1.5">
                    <Label htmlFor="amount">Amount</Label>
                    <Input
                      id="amount"
                      type="number"
                      min={1}
                      step="1"
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value || 0))}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="token">Token</Label>
                    <Input
                      id="token"
                      value={token}
                      onChange={(e) => setToken(e.target.value.toUpperCase())}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Sponsor email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={sponsorEmail}
                    onChange={(e) => setSponsorEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="context">Why this matters (optional)</Label>
                  <textarea
                    id="context"
                    className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="e.g. Critical dependency in our production pipeline."
                    value={sponsorContext}
                    onChange={(e) => setSponsorContext(e.target.value)}
                  />
                </div>

                {error && (
                  <div className="rounded-md border border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300 text-sm p-3">
                    {error}
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 pt-2">
                  <div className="text-xs text-muted-foreground">
                    Predicted routing:{" "}
                    <AutonomyTierBadge tier={tier} size="sm" />
                  </div>
                  <Button type="submit" disabled={submitting || !repoUrl || amount <= 0}>
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Opening case…
                      </>
                    ) : (
                      <>
                        Submit request <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="bg-muted/30">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" /> Sample requests
              </CardTitle>
              <CardDescription>Click to load — each triggers a different autonomy tier.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {SAMPLE_REPOS.map((s) => (
                <button
                  key={s.repo}
                  type="button"
                  onClick={() => loadSample(s)}
                  className="w-full text-left p-2 rounded-md border border-border hover:border-primary/40 hover:bg-card transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5 text-sm font-medium">
                      <Github className="w-3.5 h-3.5" /> {s.repo}
                    </div>
                    <AutonomyTierBadge tier={predictTier(s.amount)} size="sm" />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    ${s.amount.toLocaleString()}
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        </section>
      </main>
    </>
  );
}
