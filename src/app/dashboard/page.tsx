"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import WalletStatusBar from "@/components/shared/WalletStatusBar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";

type AgentStatus = "idle" | "ok" | "degraded" | "error";

export default function DashboardPage() {
  const [status, setStatus] = useState<AgentStatus>("idle");
  const [message, setMessage] = useState("Checking agent readiness...");

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
      </div>
    </div>
  );
}
