"use client";

import Link from "next/link";
import { Workflow, ArrowRight } from "lucide-react";

/**
 * Audience signpost shown at the top of /agent and /splits.
 *
 * Those pages serve the contributor self-service flow (verify, claim, pay
 * existing splits via NL chat). The hackathon submission is built around
 * the enterprise sponsor flow on /orchestration → /sponsor → /case/[id].
 * This banner makes sure a judge clicking through never mistakes the
 * consumer surface for the headline product.
 */
export default function ContributorFlowNotice() {
  return (
    <div className="rounded-lg border border-border bg-card/60 backdrop-blur-sm px-3 py-2 mb-4 text-xs flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
        <Workflow className="w-3.5 h-3.5" />
        <span className="font-medium text-foreground">Contributor self-service</span>
        <span>— for the enterprise case workflow, see</span>
      </span>
      <Link
        href="/orchestration"
        className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
      >
        Orchestration <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  );
}
