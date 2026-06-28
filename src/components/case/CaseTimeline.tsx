"use client";

import React from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Circle, AlertTriangle, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { CaseState, Stage } from "@/lib/case/types";
import { ActorBadges } from "./badges";

function StatusIcon({ status }: { status: Stage["status"] }) {
  if (status === "complete") return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
  if (status === "running")
    return <Loader2 className="w-5 h-5 text-primary animate-spin" />;
  if (status === "blocked") return <AlertTriangle className="w-5 h-5 text-rose-600" />;
  if (status === "skipped")
    return <CheckCircle2 className="w-5 h-5 text-muted-foreground/50" />;
  return <Circle className="w-5 h-5 text-muted-foreground/40" />;
}

function elapsedMs(stage: Stage): number | null {
  if (!stage.startedAt) return null;
  const end = stage.completedAt ? new Date(stage.completedAt).getTime() : Date.now();
  return end - new Date(stage.startedAt).getTime();
}

function formatElapsed(ms: number | null): string {
  if (ms === null) return "";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export default function CaseTimeline({ state }: { state: CaseState }) {
  return (
    <div className="space-y-3">
      {state.stages.map((stage, idx) => (
        <motion.div
          key={stage.key}
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: idx * 0.03 }}
        >
          <Card
            className={`overflow-hidden ${
              stage.status === "running"
                ? "border-primary/40 shadow-sm"
                : stage.status === "blocked"
                ? "border-rose-500/40"
                : ""
            }`}
          >
            <CardContent className="p-0">
              <div className="flex flex-col md:flex-row">
                <div className="md:w-20 bg-muted/40 flex md:flex-col items-center justify-center gap-2 p-3 md:py-5 border-b md:border-b-0 md:border-r border-border">
                  <div className="text-2xl font-bold text-muted-foreground/40">
                    {String(idx + 1).padStart(2, "0")}
                  </div>
                  <StatusIcon status={stage.status} />
                </div>
                <div className="flex-1 p-4">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2 mb-2">
                    <div>
                      <h3 className="text-base font-semibold">{stage.title}</h3>
                      {stage.status === "running" && (
                        <p className="text-xs text-primary mt-0.5">in progress…</p>
                      )}
                      {stage.status === "pending" && (
                        <p className="text-xs text-muted-foreground mt-0.5">waiting</p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <ActorBadges actors={stage.actors} />
                      {stage.startedAt && (
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {formatElapsed(elapsedMs(stage))}
                        </span>
                      )}
                    </div>
                  </div>
                  {stage.summary && (
                    <p className="text-sm text-muted-foreground">{stage.summary}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
