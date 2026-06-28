"use client";

import React from "react";
import { Actor, ACTOR_LABEL, AutonomyTier } from "@/lib/case/types";

const ACTOR_COLORS: Record<Actor, string> = {
  agent_builder: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30",
  external_agent: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  api_workflow: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30",
  action_center: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
  system: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30",
};

export function ActorBadges({ actors }: { actors: Actor[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {actors.map((a) => (
        <span
          key={a}
          className={`text-xs px-2 py-0.5 rounded-md border ${ACTOR_COLORS[a]}`}
        >
          {ACTOR_LABEL[a]}
        </span>
      ))}
    </div>
  );
}

const TIER_META: Record<
  AutonomyTier,
  { label: string; bg: string; ring: string }
> = {
  T0: { label: "Fully autonomous", bg: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300", ring: "border-emerald-500/40" },
  T1: { label: "Finance only", bg: "bg-blue-500/15 text-blue-700 dark:text-blue-300", ring: "border-blue-500/40" },
  T2: { label: "Finance + compliance", bg: "bg-amber-500/15 text-amber-700 dark:text-amber-300", ring: "border-amber-500/40" },
  T3: { label: "Finance + compliance + exec", bg: "bg-rose-500/15 text-rose-700 dark:text-rose-300", ring: "border-rose-500/40" },
};

export function AutonomyTierBadge({
  tier,
  size = "md",
}: {
  tier?: AutonomyTier;
  size?: "sm" | "md" | "lg";
}) {
  if (!tier) {
    return (
      <span className="text-xs px-2 py-1 rounded-md border border-border bg-muted/50 text-muted-foreground">
        Tier pending
      </span>
    );
  }
  const meta = TIER_META[tier];
  const sizeClass =
    size === "lg" ? "text-base px-3 py-1.5" : size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-2.5 py-1";
  return (
    <span className={`${sizeClass} rounded-md border-2 font-semibold ${meta.bg} ${meta.ring}`}>
      {tier} · {meta.label}
    </span>
  );
}
