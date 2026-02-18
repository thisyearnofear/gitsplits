"use client";

import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";

type Step = {
  id: string;
  label: string;
  href?: string;
  complete?: boolean;
  current?: boolean;
};

type FlowStatusStripProps = {
  steps: Step[];
  title?: string;
};

export default function FlowStatusStrip({
  steps,
  title = "Flow Status",
}: FlowStatusStripProps) {
  return (
    <div className="rounded-xl border border-border bg-card/80 backdrop-blur-sm p-3 space-y-2">
      <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">{title}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
        {steps.map((step) => {
          const content = (
            <div
              className={`rounded-md border px-2.5 py-2 text-xs font-semibold flex items-center gap-2 ${
                step.complete
                  ? "border-green-500/30 text-green-700 dark:text-green-400 bg-green-500/10"
                  : step.current
                  ? "border-primary/30 text-primary bg-primary/10"
                  : "border-border text-muted-foreground bg-muted/50"
              }`}
            >
              {step.complete ? (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <Circle className="h-3.5 w-3.5 shrink-0" />
              )}
              <span className="truncate">{step.label}</span>
            </div>
          );
          if (!step.href) return <div key={step.id}>{content}</div>;
          return (
            <Link key={step.id} href={step.href}>
              {content}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
