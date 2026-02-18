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
    <div className="rounded-xl border bg-white/80 backdrop-blur-sm p-3 space-y-2">
      <p className="text-xs font-bold tracking-wide text-gray-700 uppercase">{title}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
        {steps.map((step) => {
          const content = (
            <div
              className={`rounded-md border px-2.5 py-2 text-xs font-semibold flex items-center gap-2 ${
                step.complete
                  ? "border-green-200 text-green-800 bg-green-50"
                  : step.current
                  ? "border-blue-200 text-blue-800 bg-blue-50"
                  : "border-gray-200 text-gray-600 bg-white"
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
