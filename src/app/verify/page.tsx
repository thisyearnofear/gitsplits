"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import { Github, Wallet, CheckCircle2, AlertCircle, ExternalLink, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useNearWallet } from "@/hooks/useNearWallet";
import WalletStatusBar from "@/components/shared/WalletStatusBar";
import { trackUxEvent } from "@/lib/services/ux-events";

function toHex(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value instanceof Uint8Array) {
    return Array.from(value)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  if (Array.isArray(value)) {
    return value.map((b) => Number(b).toString(16).padStart(2, "0")).join("");
  }
  if (typeof value === "object" && value !== null) {
    const maybeSignature = (value as { signature?: unknown }).signature;
    return toHex(maybeSignature);
  }
  return "";
}

function extractGistId(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const urlMatch = trimmed.match(/gist\.github\.com\/[^/]+\/([a-f0-9]+)/i);
  if (urlMatch?.[1]) return urlMatch[1];
  return trimmed.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
}

export default function VerifyPage() {
  const searchParams = useSearchParams();
  const { open } = useAppKit();
  const { isConnected: isEvmConnected, address: evmAddress } = useAppKitAccount();
  const { isConnected: isNearConnected, accountId: nearAccountId, connect: connectNear, selector } =
    useNearWallet();

  const [githubUsername, setGithubUsername] = useState("");
  const [githubGistId, setGithubGistId] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [autoVerifying, setAutoVerifying] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState<"idle" | "success" | "error">("idle");
  const [mounted, setMounted] = useState(false);

  const prefillUser = searchParams.get("user") || "";
  const prefillRepo = searchParams.get("repo") || "";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (prefillUser && !githubUsername) {
      setGithubUsername(prefillUser.replace(/^@/, ""));
    }
  }, [prefillUser, githubUsername]);

  useEffect(() => {
    const dismissed = localStorage.getItem("gitsplits_verify_onboarding_dismissed");
    setShowOnboarding(!dismissed);
  }, []);

  const walletAddress = useMemo(() => {
    const candidates = [nearAccountId, evmAddress];
    const value = candidates.find((candidate) => candidate && candidate !== "Unknown NEAR Account");
    return value || "";
  }, [nearAccountId, evmAddress]);

  const verificationStage = useMemo(() => {
    if (isVerified) return "Ready for payouts";
    if (!walletAddress || !githubUsername.trim()) return "Not verified";
    if (verificationCode && githubGistId.trim()) return "Ready to submit verification";
    if (verificationCode) return "Partially verified - gist required";
    return "Not verified";
  }, [githubGistId, githubUsername, isVerified, verificationCode, walletAddress]);

  const generateCode = async () => {
    if (!walletAddress) {
      setMode("error");
      setMessage("Connect a wallet first.");
      return;
    }
    if (!githubUsername.trim()) {
      setMode("error");
      setMessage("GitHub username is required.");
      return;
    }

    setIsLoading(true);
    setMode("idle");
    trackUxEvent("verify_generate_code_start");
    try {
      const response = await fetch("/api/generate-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress,
          githubUsername: githubUsername.trim(),
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.githubVerificationCode) {
        throw new Error(data.error || "Failed to generate verification code.");
      }
      setVerificationCode(data.githubVerificationCode);
      setMode("success");
      setMessage("Verification code generated. Create a public gist with this exact code.");
      trackUxEvent("verify_generate_code_success");
    } catch (error) {
      setMode("error");
      setMessage(error instanceof Error ? error.message : "Failed to generate code.");
      trackUxEvent("verify_generate_code_failed");
    } finally {
      setIsLoading(false);
    }
  };

  const verifyContributor = async () => {
    if (!walletAddress || !githubUsername.trim() || !githubGistId.trim()) {
      setMode("error");
      setMessage("Wallet, GitHub username, and GitHub Gist ID are required.");
      return;
    }

    setIsLoading(true);
    setMode("idle");
    trackUxEvent("verify_submit_start");

    try {
      let nearPayload: {
        nearSignature?: string;
        nearMessage?: string;
        nearAccountId?: string;
      } = {};

      if (isNearConnected && nearAccountId && selector) {
        const nearMessage = `Sign this message to verify your NEAR address for GitSplits: ${nearAccountId}`;
        const wallet = await selector.wallet();
        const signed = await wallet.signMessage({
          message: nearMessage,
          recipient: nearAccountId,
          nonce: `${Date.now()}`,
        });
        const nearSignature = toHex(signed);
        if (nearSignature) {
          nearPayload = {
            nearSignature,
            nearMessage,
            nearAccountId,
          };
        }
      }

      const response = await fetch("/api/verify-identities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress,
          githubUsername: githubUsername.trim(),
          githubGistId: githubGistId.trim(),
          ...nearPayload,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success || !data.githubVerified) {
        throw new Error(data.error || "Verification failed. Check your gist and try again.");
      }

      setIsVerified(true);
      setMode("success");
      setMessage(
        data.nearVerified && data.contractSynced
          ? "Contributor verification complete. GitHub and NEAR are linked on-chain."
          : data.nearVerified
          ? "GitHub and NEAR verified, but contract sync is pending. Retry in a moment."
          : "GitHub verified. Connect NEAR and retry to fully link GitHub + NEAR."
      );
      trackUxEvent("verify_submit_success", { contractSynced: data.contractSynced });
    } catch (error) {
      setMode("error");
      setMessage(error instanceof Error ? error.message : "Verification failed.");
      trackUxEvent("verify_submit_failed");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!autoVerifying || isVerified || isLoading) return;
    const id = setInterval(() => {
      if (!isLoading && githubGistId.trim() && githubUsername.trim() && walletAddress) {
        void verifyContributor();
      }
    }, 8000);
    return () => clearInterval(id);
  }, [autoVerifying, githubGistId, githubUsername, isLoading, isVerified, walletAddress]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gentle-blue via-gentle-purple to-gentle-orange py-10">
      <div className="container mx-auto max-w-3xl px-4">
        <WalletStatusBar />

        <Card>
          <CardHeader>
            <CardTitle>Contributor Verification</CardTitle>
            <CardDescription>
              Link your GitHub identity and NEAR account to receive contributor payouts.
            </CardDescription>
            <p className="text-xs font-medium text-blue-700">Status: {verificationStage}</p>
            {prefillRepo && (
              <p className="text-xs text-gray-600 mt-2">
                Verification request for repository: <span className="font-mono">{prefillRepo}</span>
              </p>
            )}
          </CardHeader>

          <CardContent className="space-y-6">
            {showOnboarding && (
              <Alert>
                <AlertTitle>Quick start</AlertTitle>
                <AlertDescription>
                  1. Connect wallet. 2. Generate code and publish gist. 3. Submit verification.
                </AlertDescription>
                <div className="mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      localStorage.setItem("gitsplits_verify_onboarding_dismissed", "1");
                      setShowOnboarding(false);
                    }}
                  >
                    Dismiss
                  </Button>
                </div>
              </Alert>
            )}
            {mode === "success" && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-700" />
                <AlertTitle>Success</AlertTitle>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}
            {mode === "error" && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-md border p-4 space-y-2">
                <div className="flex items-center gap-2 font-medium">
                  <Wallet className="h-4 w-4" /> Wallet
                </div>
                <p className="text-sm text-gray-700">
                  {!mounted ? "Loading..." : walletAddress ? `Connected: ${walletAddress}` : "No wallet connected"}
                </p>
                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => mounted && open()}
                    disabled={!mounted}
                  >
                    Connect EVM
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => mounted && connectNear()}
                    disabled={!mounted}
                  >
                    Connect NEAR
                  </Button>
                </div>
              </div>

              <div className="rounded-md border p-4 space-y-2">
                <div className="flex items-center gap-2 font-medium">
                  <Github className="h-4 w-4" /> GitHub
                </div>
                <Label htmlFor="githubUsername">GitHub Username</Label>
                <Input
                  id="githubUsername"
                  value={githubUsername}
                  onChange={(e) => setGithubUsername(e.target.value)}
                  placeholder="your-github-username"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Button onClick={generateCode} disabled={isLoading || !walletAddress || !githubUsername.trim()}>
                {isLoading ? "Generating..." : "Generate GitHub Verification Code"}
              </Button>

              {verificationCode && (
                <div className="rounded-md border bg-gray-50 p-4 space-y-3">
                  <p className="text-sm font-medium">Verification code</p>
                  <pre className="overflow-x-auto rounded bg-white p-3 text-xs">{verificationCode}</pre>
                  <p className="text-xs text-gray-600">
                    Create a public gist containing this exact code, then paste the gist ID below.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => window.open("https://gist.github.com/new", "_blank")}
                  >
                    Create GitHub Gist <ExternalLink className="ml-2 h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="githubGistId">GitHub Gist ID</Label>
              <Input
                id="githubGistId"
                value={githubGistId}
                onChange={(e) => setGithubGistId(extractGistId(e.target.value))}
                placeholder="Gist ID or full gist URL"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={verifyContributor}
                disabled={isLoading || !walletAddress || !githubUsername.trim() || !githubGistId.trim()}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying
                  </>
                ) : (
                  "Verify Contributor (GitHub + NEAR)"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!walletAddress || !githubUsername.trim() || !githubGistId.trim() || isVerified}
                onClick={() => setAutoVerifying((prev) => !prev)}
              >
                {autoVerifying ? "Stop Auto-Verify" : "Auto-Verify Every 8s"}
              </Button>
            </div>

            {isVerified && (
              <p className="text-sm text-green-700">
                Verification complete. You can now manage splits and claim distributions in the dashboard.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
