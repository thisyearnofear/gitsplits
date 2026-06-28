"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import ConsoleHeader from "@/components/shared/ConsoleHeader";
import type { AutonomyTier } from "@/lib/case/types";

const SAMPLES = [
  { repo: "near/near-sdk-rs",   amount: 2500,  context: "Critical dependency in our payments rail." },
  { repo: "facebook/react",     amount: 250,   context: "We use React across every customer-facing surface." },
  { repo: "rust-lang/rust",     amount: 50000, context: "Strategic OSS investment, board-approved." },
  { repo: "vercel/next.js",     amount: 1500,  context: "Powers our marketing and dashboard sites." },
];

const TIER_META: Record<AutonomyTier, { label: string; tint: string }> = {
  T0: { label: "fully autonomous",                       tint: "text-[#b9ff66] border-[#b9ff66]/40" },
  T1: { label: "finance only",                           tint: "text-[#7fc8ff] border-[#7fc8ff]/40" },
  T2: { label: "finance + compliance",                   tint: "text-[#f5a524] border-[#f5a524]/40" },
  T3: { label: "finance + compliance + exec sponsor",    tint: "text-[#ff5c5c] border-[#ff5c5c]/40" },
};

function predictTier(amount: number): AutonomyTier {
  if (amount > 25_000) return "T3";
  if (amount > 5_000)  return "T2";
  if (amount > 500)    return "T1";
  return "T0";
}

function TierLine({ tier }: { tier: AutonomyTier }) {
  const m = TIER_META[tier];
  return (
    <span className={`mono text-[11px] tracking-wider px-2 py-1 border ${m.tint}`}>
      {tier} · {m.label.toUpperCase()}
    </span>
  );
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

  const tier = useMemo(() => predictTier(amount), [amount]);

  async function submit(e: React.FormEvent) {
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
      if (!res.ok || !data?.id) throw new Error(data?.error || `submit failed (HTTP ${res.status})`);
      router.push(`/case/${data.id}`);
    } catch (err: any) {
      setError(err?.message || "failed to create case");
      setSubmitting(false);
    }
  }

  function loadSample(s: (typeof SAMPLES)[number]) {
    setRepoUrl(s.repo);
    setAmount(s.amount);
    setSponsorContext(s.context);
  }

  const fieldBase =
    "w-full bg-transparent border-b border-[var(--c-line)] focus:border-[var(--c-accent)] py-2 outline-none text-[var(--c-ink)] transition-colors";

  return (
    <div className="console min-h-screen relative">
      <div className="absolute inset-0 console-vignette pointer-events-none" />
      <ConsoleHeader />

      <main className="max-w-5xl mx-auto px-6 pt-10 pb-24 relative">
        <div className="mono text-[11px] tracking-wider ink-faint mb-6 flex items-center gap-2">
          <Link href="/orchestration" className="hover:text-[var(--c-ink)]">ORCH</Link>
          <span>/</span>
          <span className="text-[var(--c-ink-soft)]">SPONSOR</span>
        </div>

        {/* Hero */}
        <div className="stagger mb-14">
          <div className="label mb-3">sponsor_portal · funding_request</div>
          <h1 className="display text-6xl md:text-7xl mb-4">
            Open a funding case.
          </h1>
          <p className="ink-soft text-[15px] max-w-2xl leading-relaxed">
            One form opens a UiPath Maestro case. The Approval Routing Agent assigns
            an autonomy tier from the amount and risk flags — small requests run end
            to end without paging a human; larger ones route to the right approvers.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1fr_320px] gap-x-12 gap-y-10">
          {/* Form */}
          <form onSubmit={submit} className="space-y-7 stagger">
            <div>
              <label htmlFor="repo" className="label block mb-1">repository</label>
              <input
                id="repo"
                className={`${fieldBase} mono`}
                placeholder="owner/repo or github.com/owner/repo"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-2">
                <label htmlFor="amount" className="label block mb-1">amount</label>
                <input
                  id="amount"
                  type="number"
                  min={1}
                  step="1"
                  className={`${fieldBase} num text-2xl`}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value || 0))}
                  required
                />
              </div>
              <div>
                <label htmlFor="token" className="label block mb-1">token</label>
                <input
                  id="token"
                  className={`${fieldBase} mono uppercase`}
                  value={token}
                  onChange={(e) => setToken(e.target.value.toUpperCase())}
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="label block mb-1">sponsor_email</label>
              <input
                id="email"
                type="email"
                className={fieldBase}
                value={sponsorEmail}
                onChange={(e) => setSponsorEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="context" className="label block mb-1">context · why this matters</label>
              <textarea
                id="context"
                rows={3}
                className={fieldBase}
                placeholder="e.g. Critical dependency in our production pipeline."
                value={sponsorContext}
                onChange={(e) => setSponsorContext(e.target.value)}
              />
            </div>

            {error && (
              <div className="border border-[#ff5c5c]/40 px-3 py-2 text-[13px] text-[#ff5c5c]">
                {error}
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-[var(--c-line)]">
              <div className="flex items-center gap-3 text-[13px] ink-soft">
                <span className="label">predicted_routing</span>
                <TierLine tier={tier} />
              </div>
              <button
                type="submit"
                disabled={submitting || !repoUrl || amount <= 0}
                className="group inline-flex items-center gap-2 border border-[var(--c-accent)] accent px-4 py-2 mono text-[12px] tracking-wider uppercase hover:bg-[var(--c-accent)] hover:text-[var(--c-bg)] transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[var(--c-accent)]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> opening case
                  </>
                ) : (
                  <>
                    open case
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Sample column */}
          <aside className="lg:pl-6 lg:border-l lg:border-[var(--c-line)] space-y-4 stagger">
            <div className="label">sample_requests</div>
            <p className="ink-soft text-[12.5px] leading-relaxed">
              Each triggers a different autonomy tier. Click to load.
            </p>
            <ul className="divide-y divide-[var(--c-line)]">
              {SAMPLES.map((s) => {
                const t = predictTier(s.amount);
                return (
                  <li key={s.repo}>
                    <button
                      type="button"
                      onClick={() => loadSample(s)}
                      className="w-full text-left py-3 hover:translate-x-1 transition-transform group"
                    >
                      <div className="flex items-baseline justify-between gap-2 mb-1">
                        <span className="mono text-[13px] group-hover:accent transition-colors">{s.repo}</span>
                        <span className={`mono text-[10px] tracking-wider ${TIER_META[t].tint.split(" ")[0]}`}>
                          {t}
                        </span>
                      </div>
                      <div className="num text-[11px] ink-faint">
                        ${s.amount.toLocaleString()}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>
        </div>
      </main>
    </div>
  );
}
