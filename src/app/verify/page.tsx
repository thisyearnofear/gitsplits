"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import { Buffer } from "buffer";
import { Github, Wallet, CheckCircle2, AlertCircle, ExternalLink, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useNearWallet } from "@/hooks/useNearWallet";
import WalletStatusBar from "@/components/shared/WalletStatusBar";
import FlowStatusStrip from "@/components/shared/FlowStatusStrip";
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

function normalizeRepoInput(value: string): string {
  const cleaned = value
    .trim()
    .replace(/^(https?:\/\/)?(www\.)?github\.com\//i, "")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
  return cleaned;
}

function extractGistId(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const hexIdMatch = trimmed.match(/\b([a-f0-9]{8,})\b/i);
  if (/^[a-f0-9]{8,}$/i.test(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed);
    if (url.hostname.includes("gist.github.com")) {
      const segments = url.pathname.split("/").filter(Boolean);
      const candidate = segments[segments.length - 1] || "";
      const cleaned = candidate.replace(/\.git$/i, "");
      if (/^[a-f0-9]{8,}$/i.test(cleaned)) return cleaned;
    }
  } catch {
    // Not a full URL; continue fallback parsing.
  }

  if (hexIdMatch?.[1]) return hexIdMatch[1];
  return trimmed;
}

function createNearNonce(): Buffer {
  const nonce = new Uint8Array(32);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(nonce);
    return Buffer.from(nonce);
  }
  nonce.fill(1);
  return Buffer.from(nonce);
}

function toUserFacingError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error || "Unknown error");
  const lower = raw.toLowerCase();
  if (lower.includes("invalid nonce") || lower.includes("buffer with a length of 32 bytes")) {
    return "NEAR wallet signing failed. Please reconnect your NEAR wallet and try again.";
  }
  if (lower.includes("network") || lower.includes("fetch")) {
    return "Network issue while verifying. Please retry in a few seconds.";
  }
  if (lower.includes("gist")) {
    return "We could not validate that gist. Ensure it is public and contains the exact verification code.";
  }
  return raw;
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
  const [mappingQuery, setMappingQuery] = useState("");
  const [mappingLoading, setMappingLoading] = useState(false);
  const [mappingError, setMappingError] = useState("");
  const [mappingEntries, setMappingEntries] = useState<
    Array<{ github_username: string; wallet_address: string; x_username?: string | null }>
  >([]);
  const [mappingCursor, setMappingCursor] = useState<string | null>(null);
  const [mappingNextCursor, setMappingNextCursor] = useState<string | null>(null);
  const [mappingCursorHistory, setMappingCursorHistory] = useState<string[]>([]);
  const [mappingTotal, setMappingTotal] = useState(0);
  const [repoLookup, setRepoLookup] = useState("");
  const [repoLoading, setRepoLoading] = useState(false);
  const [repoError, setRepoError] = useState("");
  const [repoStatus, setRepoStatus] = useState<{
    split_id: string;
    repo_url: string;
    total_contributors: number;
    verified: Array<{ github_username: string; wallet_address: string; x_username?: string | null }>;
    unverified: string[];
  } | null>(null);
  const mappingLimit = 10;

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
    if (prefillRepo) {
      setRepoLookup(normalizeRepoInput(prefillRepo));
    }
  }, [prefillRepo]);

  useEffect(() => {
    trackUxEvent("funnel_verify_opened", { repo: prefillRepo || undefined });
  }, [prefillRepo]);

  const loadMapping = async (nextCursor: string | null = null, query = "") => {
    try {
      setMappingLoading(true);
      setMappingError("");
      const params = new URLSearchParams();
      params.set("limit", String(mappingLimit));
      if (nextCursor) params.set("cursor", nextCursor);
      if (query.trim()) params.set("q", query.trim());
      const response = await fetch(`/api/verification-mapping?${params.toString()}`);
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to load mapping");
      }
      setMappingEntries(Array.isArray(data.entries) ? data.entries : []);
      setMappingCursor(data.cursor || null);
      setMappingNextCursor(data.nextCursor || null);
      setMappingTotal(Number(data.total || 0));
    } catch (error) {
      setMappingError(error instanceof Error ? error.message : "Failed to load mapping");
      setMappingEntries([]);
      setMappingCursor(null);
      setMappingNextCursor(null);
      setMappingTotal(0);
    } finally {
      setMappingLoading(false);
    }
  };

  const loadRepoStatus = async (repoCandidate: string) => {
    const normalized = normalizeRepoInput(repoCandidate);
    if (!normalized.includes("/")) {
      setRepoError("Enter a repository like owner/repo.");
      setRepoStatus(null);
      return;
    }
    try {
      setRepoLoading(true);
      setRepoError("");
      const response = await fetch(
        `/api/verification-mapping?repo=${encodeURIComponent(normalized)}`
      );
      const data = await response.json();
      if (!response.ok || !data.success || !data.status) {
        throw new Error(data.error || "Failed to load repository verification status");
      }
      setRepoStatus(data.status);
      trackUxEvent("verification_mapping_repo_status_loaded", { repo: normalized });
    } catch (error) {
      setRepoError(error instanceof Error ? error.message : "Failed to load repository status");
      setRepoStatus(null);
    } finally {
      setRepoLoading(false);
    }
  };

  useEffect(() => {
    void loadMapping(null, "");
  }, []);

  useEffect(() => {
    if (prefillRepo) {
      void loadRepoStatus(prefillRepo);
    }
  }, [prefillRepo]);

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

  const flowSteps = useMemo(
    () => [
      { id: "analyze", label: "Analyze", href: "/agent", complete: true },
      { id: "verify", label: "Verify", href: "/verify", complete: isVerified, current: !isVerified },
      { id: "split", label: "Create Split", href: "/splits", complete: false },
      { id: "pay", label: "Pay", href: "/splits", complete: false },
      { id: "claim", label: "Claim", href: "/splits", complete: false },
    ],
    [isVerified]
  );

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
      setMessage(toUserFacingError(error));
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
          nonce: createNearNonce(),
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
      setMessage(toUserFacingError(error));
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
        <div className="mb-4">
          <FlowStatusStrip steps={flowSteps} title="Contributor Payout Journey" />
        </div>

        <Card className="mb-20 md:mb-0">
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
                    variant={isEvmConnected ? "default" : "outline"}
                    onClick={() => mounted && open()}
                    disabled={!mounted}
                    className={isEvmConnected ? "bg-green-600 hover:bg-green-700 text-white" : ""}
                  >
                    {isEvmConnected ? (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        EVM Connected
                      </>
                    ) : (
                      "Connect EVM"
                    )}
                  </Button>
                  <Button 
                    type="button"
                    variant={isNearConnected ? "default" : "outline"}
                    onClick={() => mounted && connectNear()}
                    disabled={!mounted}
                    className={isNearConnected ? "bg-green-600 hover:bg-green-700 text-white" : ""}
                  >
                    {isNearConnected ? (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        NEAR Connected
                      </>
                    ) : (
                      "Connect NEAR"
                    )}
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

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Verification Explorer</CardTitle>
            <CardDescription>
              Search and browse the public GitHub → NEAR mapping stored in the contract.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border p-3 space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  value={repoLookup}
                  onChange={(e) => setRepoLookup(e.target.value)}
                  placeholder="owner/repo"
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={repoLoading}
                  onClick={() => void loadRepoStatus(repoLookup)}
                >
                  {repoLoading ? "Loading..." : "Check Repo Coverage"}
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {["thisyearnofear/gitsplits", "openclaw/openclaw"].map((repo) => (
                  <Button
                    key={repo}
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    onClick={() => {
                      setRepoLookup(repo);
                      void loadRepoStatus(repo);
                    }}
                  >
                    {repo}
                  </Button>
                ))}
              </div>
              {repoError && <p className="text-xs text-red-600">{repoError}</p>}
              {repoStatus && (
                <div className="text-sm space-y-2">
                  <p>
                    <span className="font-semibold">Coverage:</span>{" "}
                    {repoStatus.verified.length}/{repoStatus.total_contributors} verified
                  </p>
                  <p className="text-xs text-gray-600 break-all">
                    Repo: {repoStatus.repo_url} · Split: {repoStatus.split_id}
                  </p>
                  <div className="grid gap-2 md:grid-cols-2">
                    <div className="rounded border p-2">
                      <p className="text-xs font-semibold mb-1">Verified</p>
                      {repoStatus.verified.length === 0 ? (
                        <p className="text-xs text-gray-500">None</p>
                      ) : (
                        <ul className="space-y-1">
                          {repoStatus.verified.map((entry) => (
                            <li key={`${entry.github_username}-${entry.wallet_address}`} className="text-xs">
                              @{entry.github_username} →{" "}
                              <span className="font-mono">{entry.wallet_address}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="rounded border p-2">
                      <p className="text-xs font-semibold mb-1">Unverified</p>
                      {repoStatus.unverified.length === 0 ? (
                        <p className="text-xs text-green-700">All contributors verified</p>
                      ) : (
                        <ul className="space-y-1">
                          {repoStatus.unverified.map((user) => (
                            <li key={user} className="text-xs">
                              @{user}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                value={mappingQuery}
                onChange={(e) => setMappingQuery(e.target.value)}
                placeholder="Search by GitHub username or NEAR account"
              />
              <Button
                type="button"
                variant="outline"
                disabled={mappingLoading}
                onClick={() => {
                  trackUxEvent("verification_mapping_search");
                  setMappingCursorHistory([]);
                  void loadMapping(null, mappingQuery);
                }}
              >
                Search
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={mappingLoading}
                onClick={() => {
                  setMappingQuery("");
                  setMappingCursorHistory([]);
                  void loadMapping(null, "");
                }}
              >
                Reset
              </Button>
            </div>

            {mappingError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Explorer Error</AlertTitle>
                <AlertDescription>{mappingError}</AlertDescription>
              </Alert>
            )}

            <div className="rounded-md border">
              <div className="grid grid-cols-2 gap-2 px-3 py-2 text-xs font-semibold border-b bg-gray-50">
                <span>GitHub</span>
                <span>NEAR Wallet</span>
              </div>
              {mappingLoading ? (
                <div className="p-3 text-sm text-gray-600">Loading verification mapping...</div>
              ) : mappingEntries.length === 0 ? (
                <div className="p-3 text-sm text-gray-600">No mappings found.</div>
              ) : (
                <div className="divide-y">
                  {mappingEntries.map((entry) => (
                    <div key={`${entry.github_username}-${entry.wallet_address}`} className="grid grid-cols-2 gap-2 px-3 py-2 text-sm">
                      <a
                        className="font-medium underline-offset-2 hover:underline"
                        href={`https://github.com/${entry.github_username}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        @{entry.github_username}
                      </a>
                      <a
                        className="font-mono text-xs break-all underline-offset-2 hover:underline"
                        href={`https://nearblocks.io/address/${entry.wallet_address}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {entry.wallet_address}
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>
                Showing {mappingEntries.length} of {mappingTotal}
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={mappingLoading || mappingCursorHistory.length === 0 || Boolean(mappingQuery.trim())}
                  onClick={() => {
                    const previous = mappingCursorHistory[mappingCursorHistory.length - 1] || null;
                    setMappingCursorHistory((prev) => prev.slice(0, -1));
                    void loadMapping(previous, "");
                  }}
                >
                  Prev
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={
                    mappingLoading ||
                    Boolean(mappingQuery.trim()) ||
                    !mappingNextCursor
                  }
                  onClick={() => {
                    setMappingCursorHistory((prev) => [...prev, mappingCursor || ""]);
                    void loadMapping(mappingNextCursor, "");
                  }}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t p-3">
          <div className="max-w-3xl mx-auto flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={generateCode}
              disabled={isLoading || !walletAddress || !githubUsername.trim()}
            >
              Generate
            </Button>
            <Button
              className="flex-1"
              onClick={verifyContributor}
              disabled={isLoading || !walletAddress || !githubUsername.trim() || !githubGistId.trim()}
            >
              Verify
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
