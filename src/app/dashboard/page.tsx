"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import WalletStatusBar from "@/components/shared/WalletStatusBar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, CheckCircle2, Circle, HelpCircle, Loader2, ArrowRight, Github, Shield, Bot, Wallet } from "lucide-react";
import { motion } from "framer-motion";
import Badge from "@/components/ui/badge";

type AgentStatus = "idle" | "ok" | "degraded" | "error";

type FlowStep = {
  id: string;
  label: string;
  complete: boolean;
  actionHref?: string;
};

const RECENT_REPOS_KEY = "gitsplits_recent_repos";
const TIMELINE_KEY = "gitsplits_activity_timeline";

type TimelineItem = {
  action: string;
  status: "pending" | "success" | "failed";
  repo?: string;
  at: string;
};

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
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);

  const normalizedRepoPath = useMemo(
    () => (repoInput.trim() ? normalizeRepoPath(repoInput) : ""),
    [repoInput]
  );

  const flowSteps = useMemo<FlowStep[]>(() => {
    const hasRepo = normalizedRepoPath.length > 0;
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
      const timelineRaw = localStorage.getItem(TIMELINE_KEY);
      if (timelineRaw) setTimeline(JSON.parse(timelineRaw));
    } catch {
      setRecentRepos([]);
      setTimeline([]);
    }
  }, []);

  const pushTimeline = (item: Omit<TimelineItem, "at">) => {
    setTimeline((prev) => {
      const next = [{ ...item, at: new Date().toISOString() }, ...prev].slice(0, 10);
      try {
        localStorage.setItem(TIMELINE_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage failures.
      }
      return next;
    });
  };

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
        pushTimeline({ action: "agent_readiness", status: "success" });
        return;
      }
      setStatus("degraded");
      setMessage(data?.reason || data?.readiness?.reasons?.join(", ") || "Agent readiness degraded.");
      trackUxEvent("dashboard_agent_degraded");
      pushTimeline({ action: "agent_readiness", status: "failed" });
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Failed to check agent readiness.");
      trackUxEvent("dashboard_agent_error");
      pushTimeline({ action: "agent_readiness", status: "failed" });
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
    pushTimeline({ action: "analyze", status: "pending", repo: normalizedRepoPath });

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
      pushTimeline({ action: "analyze", status: "success", repo: normalizedRepoPath });
    } catch (error) {
      setPendingOutput(error instanceof Error ? error.message : "Failed to load repo verification insights.");
      trackUxEvent("dashboard_analyze_failed", { repo: normalizedRepoPath });
      pushTimeline({ action: "analyze", status: "failed", repo: normalizedRepoPath });
    } finally {
      setInsightLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gentle-blue via-gentle-purple to-gentle-orange py-6 md:py-10">
      <div className="container mx-auto max-w-5xl px-4 space-y-8">
        <WalletStatusBar />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2 border-0 shadow-2xl bg-white/80 backdrop-blur-xl overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600"></div>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-3xl font-black tracking-tight">CONTROL CENTER</CardTitle>
                  <CardDescription className="text-base font-medium mt-1">
                    Guided workflow to reward your contributors.
                  </CardDescription>
                </div>
                {status === "ok" ? (
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-0 font-black px-3 py-1">AGENT ONLINE</Badge>
                ) : (
                  <Badge variant="destructive" className="font-black px-3 py-1">AGENT OFFLINE</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {flowSteps.map((step, index) => (
                  <Link 
                    key={step.id} 
                    href={step.actionHref || "#"} 
                    className={`group relative p-4 rounded-2xl border-2 transition-all ${
                      step.complete 
                        ? "bg-green-50/50 border-green-100 hover:border-green-200" 
                        : "bg-white border-gray-100 hover:border-blue-200 hover:shadow-lg"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        step.complete ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400 group-hover:bg-blue-100 group-hover:text-blue-600"
                      }`}>
                        {step.id === "analyze" && <Github className="w-4 h-4" />}
                        {step.id === "verify" && <Shield className="w-4 h-4" />}
                        {step.id === "create" && <Bot className="w-4 h-4" />}
                        {step.id === "pay" && <Wallet className="w-4 h-4" />}
                        {step.id === "pending" && <AlertCircle className="w-4 h-4" />}
                      </div>
                      {step.complete && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                    </div>
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Step {index + 1}</p>
                    <p className="font-bold text-gray-900 leading-tight">{step.label}</p>
                    {!step.complete && (
                      <div className="mt-3 flex items-center text-[10px] font-black text-blue-600 uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">
                        GO TO STEP <ArrowRight className="w-3 h-3 ml-1" />
                      </div>
                    )}
                  </Link>
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                <Button 
                  onClick={() => router.push("/agent")}
                  className="flex-1 bg-black text-white hover:bg-gray-900 h-14 rounded-xl font-black text-lg shadow-xl shadow-gray-200"
                >
                  <Bot className="w-5 h-5 mr-2" />
                  OPEN AGENT CHAT
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => void checkReadiness()}
                  className="h-14 w-14 rounded-xl border-2"
                  title="Check connection"
                >
                  <Circle className={`w-4 h-4 ${status === "ok" ? "fill-green-500 text-green-500" : "fill-red-500 text-red-500"}`} />
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
              <CardHeader>
                <CardTitle className="text-xl font-black tracking-tight">QUICK ANALYZE</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Input
                    value={repoInput}
                    onChange={(e) => setRepoInput(e.target.value)}
                    placeholder="owner/repo"
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50 h-12 rounded-xl"
                  />
                </div>
                <Button 
                  onClick={runCoverageCheck} 
                  disabled={insightLoading || !normalizedRepoPath}
                  className="w-full bg-white text-blue-700 hover:bg-blue-50 h-12 rounded-xl font-black"
                >
                  {insightLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "CHECK READINESS"}
                </Button>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-black tracking-tight">RECENT ACTIVITY</CardTitle>
              </CardHeader>
              <CardContent>
                {timeline.length === 0 ? (
                  <div className="py-8 text-center">
                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Circle className="w-4 h-4 text-gray-200" />
                    </div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No activity yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {timeline.slice(0, 3).map((item, index) => (
                      <div key={`${item.at}-${index}`} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          item.status === "success" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                        }`}>
                          {item.status === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate uppercase tracking-tight">
                            {item.action.replaceAll("_", " ")}
                          </p>
                          <p className="text-[10px] font-bold text-gray-500">{new Date(item.at).toLocaleTimeString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Original Insight sections rendered only when data exists, with better styling */}
        {normalizedRepoPath && (coverageOutput || pendingOutput) && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-0 shadow-2xl overflow-hidden">
              <div className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Github className="w-5 h-5" />
                  <span className="font-black uppercase tracking-widest text-sm">{normalizedRepoPath}</span>
                </div>
                {coverageStats && (
                  <Badge className="bg-blue-500 text-white border-0 font-black">
                    {coverageStats.verified}/{coverageStats.total} VERIFIED
                  </Badge>
                )}
              </div>
              <CardContent className="p-6 grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Verification Status</h4>
                  {coverageOutput ? (
                    <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 text-blue-900 text-sm font-medium">
                      {coverageOutput}
                    </div>
                  ) : <Skeleton className="h-20 w-full rounded-xl" />}
                  
                  {coverageStats && coverageStats.verified < coverageStats.total && (
                    <Button asChild variant="destructive" className="w-full h-12 rounded-xl font-black">
                      <Link href={`/verify?repo=${encodeURIComponent(normalizedRepoPath)}`}>
                        START VERIFICATION FLOW
                      </Link>
                    </Button>
                  )}
                </div>
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Pending Claims</h4>
                  {pendingOutput ? (
                    <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 text-gray-700 text-sm font-mono whitespace-pre-wrap leading-relaxed">
                      {pendingOutput}
                    </div>
                  ) : <Skeleton className="h-20 w-full rounded-xl" />}
                  
                  <Button asChild className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 font-black">
                    <Link href={`/agent?command=${encodeURIComponent(`pay 1 USDC to github.com/${normalizedRepoPath}`)}`}>
                      EXECUTE PAYOUT
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
