"use client";

import { useMemo, useState } from "react";
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import { Github, Wallet, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useNearWallet } from "@/hooks/useNearWallet";
import WalletStatusBar from "@/components/shared/WalletStatusBar";

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

export default function VerifyPage() {
  const { open } = useAppKit();
  const { isConnected: isEvmConnected, address: evmAddress } = useAppKitAccount();
  const { isConnected: isNearConnected, accountId: nearAccountId, connect: connectNear, selector } =
    useNearWallet();

  const [githubUsername, setGithubUsername] = useState("");
  const [githubGistId, setGithubGistId] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState<"idle" | "success" | "error">("idle");

  const walletAddress = useMemo(() => {
    const candidates = [nearAccountId, evmAddress];
    const value = candidates.find((candidate) => candidate && candidate !== "Unknown NEAR Account");
    return value || "";
  }, [nearAccountId, evmAddress]);

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
    } catch (error) {
      setMode("error");
      setMessage(error instanceof Error ? error.message : "Failed to generate code.");
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
        data.nearVerified
          ? "Contributor verification complete. GitHub and NEAR are linked."
          : "GitHub verified. Connect NEAR and retry to fully link GitHub + NEAR."
      );
    } catch (error) {
      setMode("error");
      setMessage(error instanceof Error ? error.message : "Verification failed.");
    } finally {
      setIsLoading(false);
    }
  };

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
          </CardHeader>

          <CardContent className="space-y-6">
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
                  {walletAddress ? `Connected: ${walletAddress}` : "No wallet connected"}
                </p>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => open()}>
                    Connect EVM
                  </Button>
                  <Button type="button" variant="outline" onClick={connectNear}>
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
                onChange={(e) => setGithubGistId(e.target.value)}
                placeholder="e.g. a1b2c3d4e5f6"
              />
            </div>

            <Button
              onClick={verifyContributor}
              disabled={isLoading || !walletAddress || !githubUsername.trim() || !githubGistId.trim()}
            >
              {isLoading ? "Verifying..." : "Verify Contributor (GitHub + NEAR)"}
            </Button>

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
