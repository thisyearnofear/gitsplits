"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import WalletStatusBar from "@/components/shared/WalletStatusBar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { AlertCircle, CheckCircle2 } from "lucide-react";

type AgentStatus = "idle" | "ok" | "degraded" | "error";

export default function DashboardPage() {
  const [status, setStatus] = useState<AgentStatus>("idle");
  const [message, setMessage] = useState("Checking agent readiness...");
  const [repoInput, setRepoInput] = useState("");
  const [coverageOutput, setCoverageOutput] = useState("");
  const [pendingOutput, setPendingOutput] = useState("");
  const [insightLoading, setInsightLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const check = async () => {
      try {
        const response = await fetch("/api/agent", { method: "GET" });
        const data = await response.json();
        if (!isMounted) return;
        if (response.ok && data?.status === "ok") {
          setStatus("ok");
          setMessage("Agent is ready for analyze/create/pay flows.");
          return;
        }
        setStatus("degraded");
        setMessage(data?.reason || data?.readiness?.reasons?.join(", ") || "Agent readiness degraded.");
      } catch (error) {
        if (!isMounted) return;
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "Failed to check agent readiness.");
      }
    };

    check();
    return () => {
      isMounted = false;
    };
  }, []);

  const runCoverageCheck = async () => {
    if (!repoInput.trim()) return;
    setInsightLoading(true);
    setCoverageOutput("");
    setPendingOutput("");
    try {
      const repo = repoInput.trim();

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
    } catch (error) {
      setPendingOutput(error instanceof Error ? error.message : "Failed to load repo verification insights.");
    } finally {
      setInsightLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gentle-blue via-gentle-purple to-gentle-orange py-10">
      <div className="container mx-auto max-w-4xl px-4 space-y-6">
        <WalletStatusBar />

        <Card>
          <CardHeader>
            <CardTitle>Web Dashboard</CardTitle>
            <CardDescription>
              Web-first control center for contributor verification, splits, and live agent actions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {status === "ok" ? (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-700" />
                <AlertTitle>Ready</AlertTitle>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{status === "idle" ? "Checking" : "Attention"}</AlertTitle>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-3 md:grid-cols-3">
              <Link href="/verify">
                <Button className="w-full">Contributor Verification</Button>
              </Link>
              <Link href="/splits">
                <Button variant="outline" className="w-full">
                  Analyze + Create Splits
                </Button>
              </Link>
              <Link href="/agent">
                <Button variant="outline" className="w-full">
                  Agent Chat
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Verification Coverage + Pending Claims</CardTitle>
            <CardDescription>
              Check payout readiness before sending funds.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={repoInput}
                onChange={(e) => setRepoInput(e.target.value)}
                placeholder="near/near-sdk-rs or github.com/near/near-sdk-rs"
              />
              <Button onClick={runCoverageCheck} disabled={insightLoading || !repoInput.trim()}>
                {insightLoading ? "Checking..." : "Check"}
              </Button>
            </div>
            {coverageOutput && (
              <Alert>
                <AlertTitle>Coverage</AlertTitle>
                <AlertDescription>{coverageOutput}</AlertDescription>
              </Alert>
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
