"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, AlertTriangle, Github, Sparkles, ExternalLink } from "lucide-react";
import ConsoleHeader from "@/components/shared/ConsoleHeader";
import AgentConstellation from "@/components/orchestration/AgentConstellation";
import type { Actor } from "@/lib/case/types";

const ACTOR_LABEL: Record<Actor, string> = {
  agent_builder: "agent_builder",
  external_agent: "external_agent",
  api_workflow: "api_workflow",
  action_center: "action_center",
  system: "system",
};

const ACTOR_TINT: Record<Actor, string> = {
  agent_builder:  "text-[#c8a8ff]",
  external_agent: "text-[#b9ff66]",
  api_workflow:   "text-[#7fc8ff]",
  action_center:  "text-[#f5a524]",
  system:         "ink-soft",
};

type StageRow = {
  num: number;
  key: string;
  title: string;
  description: string;
  actors: Actor[];
  exception?: string;
};

const STAGES: StageRow[] = [
  { num: 1, key: "intake",              title: "Intake",                       description: "Sponsor's free-form request is parsed into structured case fields by the Intake Triage Agent.", actors: ["agent_builder"], exception: "malformed_intake" },
  { num: 2, key: "repo_analysis",       title: "Repo Analysis",                description: "Controller pulls contributor breakdown. LangChain agent runs critique + recommend over EigenAI-attested quality scores.", actors: ["api_workflow", "external_agent"], exception: "no_payable_contributors" },
  { num: 3, key: "verification_check",  title: "Verification Check",           description: "Look up which recommended contributors have wallets. Unverified contributors spawn a parallel outreach sub-case.", actors: ["api_workflow", "action_center"] },
  { num: 4, key: "compliance_approval", title: "Compliance & Approval",        description: "Sanctions screening parallel with the Approval Routing Agent. Action Center holds humans accountable.", actors: ["api_workflow", "agent_builder", "action_center"], exception: "compliance_blocked" },
  { num: 5, key: "split_creation",      title: "Split Creation",               description: "Controller writes the approved allocation to the NEAR splits contract.", actors: ["api_workflow"] },
  { num: 6, key: "payout_execution",    title: "Payout Execution",             description: "Distribute via Ping Pay or HOT Pay with automatic retry and exception-lane fallback.", actors: ["api_workflow"], exception: "payout_failed" },
  { num: 7, key: "reconciliation",      title: "Reconciliation & Attestation", description: "Verify on-chain receipts and produce a TEE-signed attestation attached to the case audit trail.", actors: ["api_workflow", "system"] },
];

const LANES = [
  { key: "malformed_intake",         label: "malformed intake",         route: "queue:intake-ops" },
  { key: "no_payable_contributors",  label: "no payable contributors",  route: "queue:sponsor-success" },
  { key: "compliance_blocked",       label: "compliance blocked",       route: "queue:compliance" },
  { key: "payout_failed",            label: "payout failed",            route: "queue:payouts-ops" },
  { key: "dispute_raised",           label: "dispute raised",           route: "queue:disputes" },
];

const UIPATH = [
  { name: "Maestro Case",        purpose: "Stage transitions, SLAs, escalation, audit timeline" },
  { name: "Agent Builder",       purpose: "Native agents for intake triage + approval routing" },
  { name: "API Workflows",       purpose: "12 auto-generated from controller OpenAPI" },
  { name: "Action Center",       purpose: "Finance, compliance, dispute, payout-recovery tasks" },
  { name: "Integration Service", purpose: "Email, sanctions screening, sponsor notify" },
  { name: "Solution (.uipx)",    purpose: "Single deployable via uip solution CLI" },
];

const EXTERNAL = [
  { name: "LangChain Insight Agent",     purpose: "Multi-step repo reasoning (Python · FastAPI)" },
  { name: "GitSplits Controller",        purpose: "Typed /v1 REST → GitHub · NEAR · Ping/HOT · EigenAI · TEE" },
  { name: "NEAR Contract",               purpose: "Splits registry + verification map + pending claims" },
  { name: "EigenAI deTERMinal",          purpose: "Attested AI inference (signature on every insight)" },
  { name: "EigenCompute / Phala dstack", purpose: "TEE attestation of final case payload" },
];

export default function OrchestrationPage() {
  return (
    <div className="console min-h-screen relative">
      <div className="absolute inset-0 console-vignette pointer-events-none" />
      <ConsoleHeader />

      <main className="relative">
        {/* HERO with constellation */}
        <section className="max-w-7xl mx-auto px-6 pt-10 pb-16">
          <div className="grid lg:grid-cols-[1fr_1.1fr] gap-12 items-center">
            <div className="stagger">
              <div className="label mb-4">
                uipath agenthack 2026 · track 1 · maestro case
              </div>
              <h1 className="display text-6xl md:text-7xl mb-5">
                Enterprise OSS funding,
                <br />
                <span className="ink-soft italic">orchestrated.</span>
              </h1>
              <p className="ink-soft text-[15px] max-w-xl leading-relaxed mb-6">
                A sponsor's funding request becomes a UiPath Maestro case. Agents handle
                intake triage, repo analysis, verification, and payout autonomously. Humans
                approve only the high-impact decisions. Every step audited; every payout
                TEE-attested.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/sponsor"
                  className="group inline-flex items-center gap-2 border border-[var(--c-accent)] accent px-4 py-2 mono text-[12px] tracking-wider uppercase hover:bg-[var(--c-accent)] hover:text-[var(--c-bg)] transition-colors"
                >
                  open a funding case
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
                <Link
                  href="https://github.com/thisyearnofear/gitsplits"
                  target="_blank"
                  className="inline-flex items-center gap-2 border border-[var(--c-line-bold)] px-4 py-2 mono text-[12px] tracking-wider uppercase ink-soft hover:text-[var(--c-ink)] hover:border-[var(--c-ink)] transition-colors"
                >
                  <Github className="w-3.5 h-3.5" /> source
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
            <div className="relative">
              <AgentConstellation />
              <div className="absolute top-3 left-3 mono text-[10.5px] tracking-wider ink-faint">
                <span className="live-dot mr-2" /> agent_topology · live
              </div>
            </div>
          </div>
        </section>

        {/* PLATFORM COMPONENTS — two columns, no cards */}
        <section className="max-w-7xl mx-auto px-6 pb-20">
          <div className="grid md:grid-cols-2 gap-12 border-t border-[var(--c-line)] pt-10">
            <div>
              <div className="label mb-5">uipath_platform · 6</div>
              <ul className="divide-y divide-[var(--c-line)]">
                {UIPATH.map((c) => (
                  <li key={c.name} className="py-3 flex items-baseline gap-5">
                    <span className="mono text-[13px] w-44 shrink-0">{c.name}</span>
                    <span className="ink-soft text-[12.5px]">{c.purpose}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="label mb-5 accent">external_agents · 5</div>
              <ul className="divide-y divide-[var(--c-line)]">
                {EXTERNAL.map((c) => (
                  <li key={c.name} className="py-3 flex items-baseline gap-5">
                    <span className="mono text-[13px] w-44 shrink-0">{c.name}</span>
                    <span className="ink-soft text-[12.5px]">{c.purpose}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* CASE FLOW — ticker-style list */}
        <section className="max-w-7xl mx-auto px-6 pb-20">
          <div className="border-t border-[var(--c-line)] pt-10">
            <div className="flex items-baseline justify-between mb-6">
              <h2 className="display text-4xl">Case flow</h2>
              <span className="label">7 stages · 5 exception lanes</span>
            </div>

            <div className="font-mono text-[13px]">
              <div className="flex items-center justify-between py-2 border-b border-[var(--c-line)]">
                <div className="label">stage</div>
                <div className="label">actors / exception</div>
              </div>
              <ol className="divide-y divide-[var(--c-line)]">
                {STAGES.map((s) => (
                  <li key={s.key} className="py-5 grid grid-cols-[40px_1fr_auto] gap-5 items-start">
                    <span className="ink-faint num text-[11px] pt-1">{String(s.num).padStart(2, "0")}</span>
                    <div>
                      <div className="text-[15px] mb-1">{s.title}</div>
                      <p className="ink-soft text-[12.5px] font-body leading-relaxed max-w-2xl">{s.description}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <div className="flex gap-1.5 flex-wrap justify-end">
                        {s.actors.map((a) => (
                          <span key={a} className={`mono text-[10.5px] tracking-wider ${ACTOR_TINT[a]} border border-[var(--c-line)] px-1.5 py-0.5`}>
                            {ACTOR_LABEL[a]}
                          </span>
                        ))}
                      </div>
                      {s.exception && (
                        <span className="flex items-center gap-1 text-[10.5px] text-[#f5a524] mono">
                          <AlertTriangle className="w-3 h-3" />
                          {s.exception}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* EXCEPTION LANES — single row */}
        <section className="max-w-7xl mx-auto px-6 pb-20">
          <div className="border-t border-[var(--c-line)] pt-10">
            <div className="flex items-baseline justify-between mb-6">
              <h2 className="display text-4xl">Exception lanes</h2>
              <span className="label">action_center · queues</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 border border-[var(--c-line)]">
              {LANES.map((lane, i) => (
                <div key={lane.key} className={`px-4 py-4 border-[var(--c-line)] ${i < LANES.length - 1 ? "md:border-r" : ""} ${i % 2 === 0 ? "border-r" : ""} ${i >= 2 ? "border-t md:border-t-0" : ""}`}>
                  <div className="flex items-center gap-1.5 text-[#f5a524] mb-2">
                    <AlertTriangle className="w-3 h-3" />
                    <span className="mono text-[11px] tracking-wider">{lane.label.toUpperCase().replace(/ /g, "_")}</span>
                  </div>
                  <div className="ink-faint text-[11px] mono">{lane.route}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CLAUDE CODE BONUS */}
        <section className="max-w-7xl mx-auto px-6 pb-24">
          <div className="border-t border-[var(--c-line)] pt-10">
            <div className="grid md:grid-cols-[auto_1fr] gap-6 items-start">
              <div className="mono text-[10.5px] tracking-wider accent flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" /> built_with_claude_code
              </div>
              <div className="ink-soft text-[13.5px] leading-relaxed max-w-3xl">
                Scaffolded with Claude Code (Opus 4.7) via the UiPath for Coding Agents pattern.
                The controller&apos;s typed /v1 adapter and OpenAPI spec, the LangChain insight
                agent end-to-end, the Maestro case definition + workflow catalog + Agent Builder
                specs — all produced by Claude Code from the architecture brief. The demo video
                shows it generating these artifacts live.
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
