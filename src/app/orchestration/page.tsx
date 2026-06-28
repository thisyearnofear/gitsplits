"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  ArrowRight,
  AlertTriangle,
  Bot,
  Users,
  Shield,
  Coins,
  FileCheck,
  Mail,
  Workflow,
  Sparkles,
  Github,
  ExternalLink,
} from "lucide-react";
import Header from "@/components/shared/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Badge from "@/components/ui/badge";

type Actor = "agent_builder" | "external_agent" | "api_workflow" | "action_center" | "system";

const ACTOR_META: Record<Actor, { label: string; color: string }> = {
  agent_builder: { label: "UiPath Agent Builder", color: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30" },
  external_agent: { label: "LangChain (External)", color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" },
  api_workflow: { label: "UiPath API Workflow", color: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30" },
  action_center: { label: "UiPath Action Center", color: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30" },
  system: { label: "Maestro / TEE", color: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30" },
};

type Stage = {
  number: number;
  title: string;
  description: string;
  actors: Actor[];
  icon: React.ComponentType<{ className?: string }>;
  exceptionLane?: string;
};

const STAGES: Stage[] = [
  {
    number: 1,
    title: "Intake",
    description: "Sponsor's free-form funding request is parsed into structured case fields by the Intake Triage Agent.",
    actors: ["agent_builder"],
    icon: Mail,
    exceptionLane: "malformed_intake",
  },
  {
    number: 2,
    title: "Repo Analysis",
    description: "Controller pulls contributor breakdown from GitHub. LangChain agent runs critique + recommend over EigenAI-attested quality scores.",
    actors: ["api_workflow", "external_agent"],
    icon: Github,
    exceptionLane: "no_payable_contributors",
  },
  {
    number: 3,
    title: "Verification Check",
    description: "Look up which recommended contributors already have NEAR wallets linked. Spawns a parallel outreach sub-case for unverified contributors.",
    actors: ["api_workflow", "action_center"],
    icon: Shield,
  },
  {
    number: 4,
    title: "Compliance & Approval",
    description: "Sanctions screening runs in parallel with the Approval Routing Agent picking approvers. Action Center holds humans accountable.",
    actors: ["api_workflow", "agent_builder", "action_center"],
    icon: FileCheck,
    exceptionLane: "compliance_blocked",
  },
  {
    number: 5,
    title: "Split Creation",
    description: "Controller writes the approved allocation to the NEAR splits contract.",
    actors: ["api_workflow"],
    icon: Users,
  },
  {
    number: 6,
    title: "Payout Execution",
    description: "Distribute funds via Ping Pay or HOT Pay with automatic retry and exception-lane fallback for failed payouts.",
    actors: ["api_workflow"],
    icon: Coins,
    exceptionLane: "payout_failed",
  },
  {
    number: 7,
    title: "Reconciliation & Attestation",
    description: "Verify on-chain receipts and produce a TEE-signed attestation attached to the case audit trail.",
    actors: ["api_workflow", "system"],
    icon: Sparkles,
  },
];

const EXCEPTION_LANES = [
  { key: "malformed_intake", label: "Malformed Intake", route: "queue:intake-ops" },
  { key: "no_payable_contributors", label: "No Payable Contributors", route: "queue:sponsor-success" },
  { key: "compliance_blocked", label: "Compliance Blocked", route: "queue:compliance" },
  { key: "payout_failed", label: "Payout Failed", route: "queue:payouts-ops" },
  { key: "dispute_raised", label: "Dispute Raised", route: "queue:disputes" },
];

const UIPATH_COMPONENTS = [
  { name: "Maestro Case", purpose: "Stage transitions, SLAs, escalation, audit timeline" },
  { name: "Agent Builder", purpose: "Native UiPath agents for intake triage & approver routing" },
  { name: "API Workflows", purpose: "12 auto-generated from controller OpenAPI; 4 integration stubs" },
  { name: "Action Center", purpose: "Finance, compliance, dispute, and payout-recovery human tasks" },
  { name: "Integration Service", purpose: "Email, sanctions screening, sponsor notifications" },
  { name: "UiPath Solution (.uipx)", purpose: "All projects bundled and deployed via `uip solution` CLI" },
];

const AUTONOMY_TIERS = [
  {
    tier: "T0",
    label: "Fully autonomous",
    trigger: "≤ $500, no risk flags, sanctions cleared",
    approvers: "None",
    outcome: "Closes end-to-end in <5 min",
    accent: "border-emerald-500/40 bg-emerald-500/5",
  },
  {
    tier: "T1",
    label: "Finance only",
    trigger: "$501–$5,000",
    approvers: "1 finance signature (24h SLA)",
    outcome: "Same-day completion",
    accent: "border-blue-500/40 bg-blue-500/5",
  },
  {
    tier: "T2",
    label: "Finance + compliance",
    trigger: "$5,001–$25,000 or any warning flag",
    approvers: "2 approvers in parallel",
    outcome: "1–2 day completion",
    accent: "border-amber-500/40 bg-amber-500/5",
  },
  {
    tier: "T3",
    label: "Finance + compliance + exec",
    trigger: "> $25,000, high-criticality repo, or blocker flag",
    approvers: "3 approvers in chain",
    outcome: "Multi-day, full board-grade audit",
    accent: "border-rose-500/40 bg-rose-500/5",
  },
];

const EXTERNAL_COMPONENTS = [
  { name: "LangChain Insight Agent", purpose: "Multi-step repo reasoning (Python, FastAPI)" },
  { name: "GitSplits Controller", purpose: "Typed /v1 REST API → GitHub, NEAR, Ping/HOT, EigenAI, TEE" },
  { name: "NEAR Contract", purpose: "Splits registry + verification map + pending claims" },
  { name: "EigenAI deTERMinal", purpose: "Attested AI inference (signature attached to insight)" },
  { name: "EigenCompute / Phala dstack", purpose: "TEE attestation of final case payload" },
];

function ActorBadges({ actors }: { actors: Actor[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {actors.map((a) => (
        <span key={a} className={`text-xs px-2 py-0.5 rounded-md border ${ACTOR_META[a].color}`}>
          {ACTOR_META[a].label}
        </span>
      ))}
    </div>
  );
}

export default function OrchestrationPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-b from-background to-muted/30 pb-20">
        <section className="container mx-auto px-4 pt-12 pb-8 max-w-6xl">
          <div className="flex items-center gap-2 mb-4">
            <Badge className="bg-primary/10 text-primary border-primary/30">
              UiPath AgentHack 2026 · Track 1 · Maestro Case
            </Badge>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Enterprise OSS Funding,
            <br />
            <span className="text-muted-foreground">Orchestrated on UiPath Maestro</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl">
            A sponsor's funding request becomes a fully orchestrated case: intake triage,
            AI-driven repo analysis, contributor verification, compliance and approval,
            on-chain split creation, multi-rail payout, and TEE-attested reconciliation.
            Humans stay in charge at every sensitive decision point.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="https://github.com/thisyearnofear/gitsplits" target="_blank">
                <Github className="w-4 h-4 mr-2" /> View on GitHub
                <ExternalLink className="w-3 h-3 ml-1" />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/agent">Try the contributor chat</Link>
            </Button>
          </div>
        </section>

        <section className="container mx-auto px-4 max-w-6xl mb-12">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Workflow className="w-5 h-5 text-primary" /> UiPath Platform Components
                </CardTitle>
                <CardDescription>What runs inside UiPath Automation Cloud</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {UIPATH_COMPONENTS.map((c) => (
                    <li key={c.name} className="flex gap-3">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <div>
                        <div className="font-medium text-sm">{c.name}</div>
                        <div className="text-sm text-muted-foreground">{c.purpose}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-emerald-600" /> External Agents & Services
                </CardTitle>
                <CardDescription>Called by Maestro via API Workflows</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {EXTERNAL_COMPONENTS.map((c) => (
                    <li key={c.name} className="flex gap-3">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                      <div>
                        <div className="font-medium text-sm">{c.name}</div>
                        <div className="text-sm text-muted-foreground">{c.purpose}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-2xl font-bold mb-2">Case Flow</h2>
          <p className="text-muted-foreground mb-8">
            Seven stages. Five exception lanes. Every transition is logged to the Maestro case timeline.
          </p>

          <div className="space-y-4">
            {STAGES.map((stage, idx) => {
              const Icon = stage.icon;
              return (
                <motion.div
                  key={stage.number}
                  initial={false}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                >
                  <Card className="overflow-hidden">
                    <CardContent className="p-0">
                      <div className="flex flex-col md:flex-row">
                        <div className="md:w-24 bg-muted/50 flex md:flex-col items-center justify-center gap-2 p-4 md:py-6 border-b md:border-b-0 md:border-r border-border">
                          <div className="text-3xl font-bold text-muted-foreground/50">
                            {String(stage.number).padStart(2, "0")}
                          </div>
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 p-5">
                          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-3">
                            <h3 className="text-lg font-semibold">{stage.title}</h3>
                            <ActorBadges actors={stage.actors} />
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">{stage.description}</p>
                          {stage.exceptionLane && (
                            <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>
                                Exception lane: <code className="text-amber-900 dark:text-amber-300 font-mono">{stage.exceptionLane}</code>
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  {idx < STAGES.length - 1 && (
                    <div className="flex justify-center my-2">
                      <ArrowRight className="w-4 h-4 text-muted-foreground rotate-90" />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </section>

        <section className="container mx-auto px-4 max-w-6xl mt-16">
          <h2 className="text-2xl font-bold mb-2">Autonomy Profile</h2>
          <p className="text-muted-foreground mb-6">
            Agents run end-to-end where it&apos;s safe. Humans are accountable for the high-impact decisions.
            The Approval Routing Agent assigns one of four tiers per case; ~80% of OSS funding requests fit T0.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-12">
            {AUTONOMY_TIERS.map((tier) => (
              <Card key={tier.tier} className={`border-2 ${tier.accent}`}>
                <CardContent className="pt-4 pb-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold tracking-tight">{tier.tier}</span>
                    <span className="text-xs text-muted-foreground uppercase tracking-wide">{tier.label}</span>
                  </div>
                  <div className="text-xs">
                    <div className="text-muted-foreground mb-1">Trigger</div>
                    <div className="font-medium">{tier.trigger}</div>
                  </div>
                  <div className="text-xs">
                    <div className="text-muted-foreground mb-1">Approvers</div>
                    <div className="font-medium">{tier.approvers}</div>
                  </div>
                  <div className="text-xs">
                    <div className="text-muted-foreground mb-1">Outcome</div>
                    <div className="font-medium">{tier.outcome}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <h2 className="text-2xl font-bold mb-2">Exception Lanes</h2>
          <p className="text-muted-foreground mb-6">
            Triggerable from any stage. Each routes to an Action Center queue with its own SLA.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {EXCEPTION_LANES.map((lane) => (
              <Card key={lane.key} className="border-amber-500/20">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <div className="font-medium text-sm">{lane.label}</div>
                      <code className="text-xs text-muted-foreground">{lane.route}</code>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="container mx-auto px-4 max-w-6xl mt-16">
          <Card className="bg-gradient-to-br from-primary/5 to-emerald-500/5 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" /> Built with Claude Code
              </CardTitle>
              <CardDescription>UiPath for Coding Agents · bonus judging criterion</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>This submission was scaffolded end-to-end with Claude Code (Opus 4.7) acting as the coding agent:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>The controller&apos;s typed /v1 REST adapter and OpenAPI spec.</li>
                <li>The LangChain Repo Insight Agent (Python, FastAPI, multi-step chain).</li>
                <li>The Maestro case definition, API workflow catalog, and Agent Builder specs.</li>
              </ul>
              <p className="pt-2">The demo video shows Claude Code producing these artifacts live.</p>
            </CardContent>
          </Card>
        </section>
      </main>
    </>
  );
}
