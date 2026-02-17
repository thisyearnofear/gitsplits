"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import WalletStatusBar from "@/components/shared/WalletStatusBar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, CheckCircle2, Circle, Loader2 } from "lucide-react";
import { trackUxEvent } from "@/lib/services/ux-events";

type AgentStatus = "idle" | "ok" | "degraded" | "error";

type FlowStep = {
  id: string;
  label: string;
  complete: boolean;
  actionHref?: string;
};

const RECENT_REPOS_KEY = "gitsplits_recent_repos";

function normalizeRepoPath(input: string): string {
  return input
    .trim()
    .replace(/^(https?:\/\/)?(www\.)?github\.com\//i, "")
    .replace(/\/+$/, "");
}

export default function DashboardPage() {
  const [status, setStatus] = useState<AgentStatus>("idle");
  const [message, setMessage] = useState("Checking live agent connection...");
  const [repoInput, setRepoInput] = useState("");
  const [coverageOutput, setCoverageOutput] = useState("");
  const [coverageStats, setCoverageStats] = useState<{ verified: number; total: number } | null>(null);
  const [pendingOutput, setPendingOutput] = useState("");
  const [insightLoading, setInsightLoading] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<string>("");
  const [recentRepos, setRecentRepos] = useState<string[]>([]);

  const normalizedRepoPath = useMemo(
    () => (repoInput.trim() ? normalizeRepoPath(repoInput) : ""),
    [repoInput]
  );

  const flowSteps = useMemo<FlowStep[]>(() => {
    const hasCoverage = !!coverageStats;
    const hasVerified = !!coverageStats && coverageStats.verified > 0;
    const hasPendingData = pendingOutput.length > 0;
    return [
      { id: "analyze", label: "Analyze repository", complete: hasCoverage },
      {
        id: "verify",
        label: "Verify contributor coverage",
        complete: !!coverageStats && coverageStats.verified === coverageStats.total,
        actionHref: hasRepo ? `/verify?repo=${encodeURIComponent(normalizedRepoPath)}` : "/verify",
      },
      {
        id: "create",
        label: "Create or repair split",
        complete: hasCoverage,
        actionHref: "/splits",
      },
      {
        id: "pay",
        label: "Pay verified contributors",
        complete: hasVerified,
        actionHref: hasRepo
          ? `/agent?command=${encodeURIComponent(`pay 1 USDC to github.com/${normalizedRepoPath}`)}`
          : "/agent",
      },
      {
        id: "pending",
        label: "Review pending claims",
        complete: hasPendingData,
        actionHref: "/splits",
      },
    ];
  }, [coverageStats, normalizedRepoPath, pendingOutput]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_REPOS_KEY);
      if (raw) setRecentRepos(JSON.parse(raw));
    } catch {
      setRecentRepos([]);
    }
  }, []);

  const persistRecentRepo = (repo: string) => {
    const path = normalizeRepoPath(repo);
    if (!path) return;
    setRecentRepos((prev) => {
      const next = [path, ...prev.filter((item) => item !== path)].slice(0, 5);
      try {
        localStorage.setItem(RECENT_REPOS_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage failures.
      }
      return next;
    });
  };

  const checkReadiness = async () => {
    setStatus("idle");
    setMessage("Checking live agent connection...");
    try {
      const response = await fetch("/api/agent", { method: "GET" });
      const data = await response.json();
      setLastCheckedAt(new Date().toLocaleTimeString());
      if (response.ok && data?.status === "ok") {
        setStatus("ok");
        setMessage("Live agent connected and ready.");
        trackUxEvent("dashboard_agent_ready");
        return;
      }
      setStatus("degraded");
      setMessage(data?.reason || data?.readiness?.reasons?.join(", ") || "Agent readiness degraded.");
      trackUxEvent("dashboard_agent_degraded");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Failed to check agent readiness.");
      trackUxEvent("dashboard_agent_error");
    }
  };

  useEffect(() => {
    void checkReadiness();
  }, []);

  const runCoverageCheck = async () => {
    if (!normalizedRepoPath) return;
    setInsightLoading(true);
    setCoverageOutput("");
    setPendingOutput("");
    setCoverageStats(null);
    persistRecentRepo(normalizedRepoPath);
    trackUxEvent("dashboard_analyze_start", { repo: normalizedRepoPath });

    try {
      const repo = `github.com/${normalizedRepoPath}`;
      const analyzeRes = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: `analyze ${repo}` }),
      });
      const analyzeData = await analyzeRes.json();
      if (!analyzeRes.ok || !analyzeData?.success) {
        throw new Error(analyzeData?.error || "Analyze request failed");
      }

      const analyzeText = String(analyzeData.response || "");
      const coverageLine =
        analyzeText
          .split("\n")
          .find((line) => line.toLowerCase().includes("verification coverage")) ||
        "Verification coverage unavailable.";
      setCoverageOutput(coverageLine);
      const coverageMatch = coverageLine.match(/(\d+)\s*\/\s*(\d+)\s+verified/i);
      setCoverageStats(
        coverageMatch
          ? { verified: Number(coverageMatch[1]), total: Number(coverageMatch[2]) }
          : null
      );

      const pendingRes = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: `pending ${repo}` }),
      });
      const pendingData = await pendingRes.json();
      if (!pendingRes.ok || !pendingData?.success) {
        throw new Error(pendingData?.error || "Pending claims request failed");
      }
      setPendingOutput(String(pendingData.response || ""));
      trackUxEvent("dashboard_analyze_success", { repo: normalizedRepoPath });
    } catch (error) {
      setPendingOutput(error instanceof Error ? error.message : "Failed to load repo verification insights.");
      trackUxEvent("dashboard_analyze_failed", { repo: normalizedRepoPath });
    } finally {
      setInsightLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gentle-blue via-gentle-purple to-gentle-orange py-6 md:py-10">
      <div className="container mx-auto max-w-5xl px-4 space-y-6">
        <WalletStatusBar />

        <Card>
          <CardHeader>
            <CardTitle>Control Center</CardTitle>
            <CardDescription>
              Follow the guided flow to get contributors paid with minimal friction.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {status === "idle" ? (
              <div className="space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-80" />
              </div>
            ) : status === "ok" ? (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-700" />
                <AlertTitle>Live Agent Connected</AlertTitle>
                <AlertDescription>
                  {message}
                  {lastCheckedAt ? ` Last check: ${lastCheckedAt}.` : ""}
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Connection Needs Attention</AlertTitle>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => void checkReadiness()}>
                Retry Connectivity Check
              </Button>
              <Link href="/agent">
                <Button type="button" variant="secondary">Open Agent Chat</Button>
              </Link>
            </div>

            <div className="grid gap-2 md:grid-cols-5">
              {flowSteps.map((step, index) => (
                <div key={step.id} className="rounded border bg-white p-3 text-xs md:text-sm">
                  <div className="flex items-center gap-2">
                    {step.complete ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <Circle className="h-4 w-4 text-gray-400" />
                    )}
                    <span className="font-medium">{`${index + 1}. ${step.label}`}</span>
                  </div>
                  {step.actionHref && (
                    <div className="mt-2">
                      <Link href={step.actionHref} className="text-blue-700 underline">
                        Go to step
                      </Link>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payout Readiness</CardTitle>
            <CardDescription>Analyze verification coverage and pending claims before paying.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={repoInput}
                onChange={(e) => setRepoInput(e.target.value)}
                placeholder="near/near-sdk-rs or github.com/near/near-sdk-rs"
              />
              <Button onClick={runCoverageCheck} disabled={insightLoading || !normalizedRepoPath}>
                {insightLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking
                  </>
                ) : (
                  "Check Readiness"
                )}
              </Button>
            </div>

            {recentRepos.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {recentRepos.map((repo) => (
                  <Button
                    key={repo}
                    type="button"
                    variant="outline"
                    className="h-8 text-xs"
                    onClick={() => setRepoInput(repo)}
                  >
                    {repo}
                  </Button>
                ))}
              </div>
            )}

            {coverageOutput && (
              <Alert>
                <AlertTitle>Coverage</AlertTitle>
                <AlertDescription>{coverageOutput}</AlertDescription>
              </Alert>
            )}

            {normalizedRepoPath && coverageStats && coverageStats.verified < coverageStats.total && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Unverified Contributors Detected</AlertTitle>
                <AlertDescription>
                  {`${coverageStats.total - coverageStats.verified} contributor(s) are not verified yet. `}
                  <Link
                    href={`/verify?repo=${encodeURIComponent(normalizedRepoPath)}`}
                    className="underline"
                  >
                    Open verification flow
                  </Link>
                  .
                </AlertDescription>
              </Alert>
            )}

            {normalizedRepoPath && coverageStats && coverageStats.verified > 0 && (
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/agent?command=${encodeURIComponent(
                    `pay 1 USDC to github.com/${normalizedRepoPath}`
                  )}`}
                >
                  <Button type="button" variant="outline">Open Pay Command</Button>
                </Link>
                <Link href="/splits">
                  <Button type="button" variant="secondary">Open Splits Workspace</Button>
                </Link>
              </div>
            )}

            {pendingOutput && (
              <div className="rounded border bg-gray-50 p-3 text-sm whitespace-pre-wrap">
                {pendingOutput}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
