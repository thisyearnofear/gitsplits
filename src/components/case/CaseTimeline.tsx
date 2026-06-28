"use client";

import React from "react";
import { ACTOR_LABEL, CaseState, Stage } from "@/lib/case/types";

const ACTOR_GLYPH: Record<string, string> = {
  agent_builder: "AB",
  external_agent: "LC",
  api_workflow: "AW",
  action_center: "AC",
  system: "MS",
};

const ACTOR_ACCENT: Record<string, string> = {
  agent_builder: "text-[#c8a8ff]",
  external_agent: "text-[#b9ff66]",
  api_workflow: "text-[#7fc8ff]",
  action_center: "text-[#f5a524]",
  system: "ink-soft",
};

function StatusGlyph({ status }: { status: Stage["status"] }) {
  if (status === "complete")
    return <span className="accent">✓</span>;
  if (status === "running")
    return <span className="live-dot pulse" aria-label="running" />;
  if (status === "blocked")
    return <span className="text-[--c-danger]">!</span>;
  return <span className="ink-faint">·</span>;
}

function elapsedMs(stage: Stage): number | null {
  if (!stage.startedAt) return null;
  const end = stage.completedAt ? new Date(stage.completedAt).getTime() : Date.now();
  return end - new Date(stage.startedAt).getTime();
}

function formatElapsed(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export default function CaseTimeline({ state }: { state: CaseState }) {
  return (
    <div className="font-mono text-[13px]">
      {/* Header rule */}
      <div className="flex items-center justify-between py-2 border-b border-[var(--c-line)]">
        <div className="label">stage</div>
        <div className="flex items-center gap-6">
          <div className="label">actors</div>
          <div className="label w-20 text-right">elapsed</div>
        </div>
      </div>

      <ol className="divide-y divide-[var(--c-line)]">
        {state.stages.map((stage, idx) => {
          const isRunning = stage.status === "running";
          const isComplete = stage.status === "complete";
          const isPending = stage.status === "pending";
          const num = String(idx + 1).padStart(2, "0");
          return (
            <li
              key={stage.key}
              className={`py-4 ${isRunning ? "bg-[var(--c-bg-soft)] -mx-4 px-4" : ""} transition-colors`}
            >
              <div className="flex items-start gap-5">
                <div className="w-12 shrink-0 flex flex-col items-start gap-2 pt-0.5">
                  <span className="ink-faint num text-[11px]">{num}</span>
                  <StatusGlyph status={stage.status} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-3 mb-1">
                    <span className={`text-[14px] ${isPending ? "ink-faint" : ""}`}>
                      {stage.title.toLowerCase().replace(/ & /g, "_").replace(/ /g, "_")}
                    </span>
                    {isRunning && (
                      <span className="micro accent">running</span>
                    )}
                  </div>
                  {stage.summary && (
                    <p className={`text-[12.5px] ${isPending ? "ink-faint" : "ink-soft"} font-body leading-relaxed`}>
                      {stage.summary}
                    </p>
                  )}
                  {/* progress bar */}
                  <div className="mt-2.5 bar">
                    <i className={isComplete ? "complete" : isRunning ? "running" : ""} style={{ width: isComplete ? "100%" : isRunning ? "50%" : 0 }} />
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <div className="flex gap-1.5">
                    {stage.actors.map((a) => (
                      <span
                        key={a}
                        title={ACTOR_LABEL[a]}
                        className={`mono text-[10px] tracking-wider ${ACTOR_ACCENT[a] || "ink-soft"} border border-[var(--c-line)] px-1.5 py-0.5 leading-none`}
                      >
                        {ACTOR_GLYPH[a]}
                      </span>
                    ))}
                  </div>
                  <span className="ink-faint num text-[11px] w-20 text-right">
                    {formatElapsed(elapsedMs(stage))}
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
