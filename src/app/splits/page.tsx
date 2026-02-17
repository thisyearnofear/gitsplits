"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAppKitAccount } from "@reown/appkit/react";
import { useNearWallet } from "@/hooks/useNearWallet";
import WalletStatusBar from "@/components/shared/WalletStatusBar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, CheckCircle2, GitBranch, Loader2 } from "lucide-react";
import { trackUxEvent } from "@/lib/services/ux-events";

type ParsedContributor = {
  githubUsername: string;
  percentage: number;
};

type AgentApiResponse = {
  success?: boolean;
  response?: string;
  error?: string;
};

type OutreachBundle = {
  verifyUrl: string;
  dmText: string;
  tweetText: string;
  castText: string;
  githubIssueUrl: string | null;
  prCommentTemplate: string;
};

type CoverageStats = {
  verified: number;
  total: number;
};

const RECENT_REPOS_KEY = "gitsplits_recent_repos";

function normalizeRepoUrl(input: string): string {
  const cleaned = input
    .trim()
    .replace(/^(https?:\/\/)?(www\.)?github\.com\//i, "")
    .replace(/\/+$/, "");
  return `github.com/${cleaned}`;
}

function parseContributorsFromAnalyzeResponse(response: string): ParsedContributor[] {
  return response
    .split("\n")
    .map((line) => line.trim())
    .map((line) => {
      const match = line.match(/^[^a-zA-Z0-9]*([a-zA-Z0-9_.-]+):.*\((\d+)%\)/);
      if (!match) return null;
      return {
        githubUsername: match[1],
        percentage: Number(match[2]),
      };
    })
    .filter((item): item is ParsedContributor => !!item);
}

function parseRepoPath(normalizedRepoUrl: string): string | null {
  const match = normalizedRepoUrl.match(/^github\.com\/([^/]+\/[^/]+)$/i);
  return match ? match[1] : null;
}

function parsePendingUsernames(response: string): Set<string> {
  const usernames = response
    .split("\n")
    .map((line) => line.trim())
    .map((line) => {
      const match = line.match(/^-\s+([a-zA-Z0-9_.-]+):/);
      return match ? match[1] : null;
    })
    .filter((item): item is string => !!item);
  return new Set(usernames);
}

export default function SplitsPage() {
  const { isConnected: isNearConnected, accountId: nearAccountId } = useNearWallet();
  const { isConnected: isEvmConnected, address: evmAddress } = useAppKitAccount();
  const [repoInput, setRepoInput] = useState("");
  const [contributors, setContributors] = useState<ParsedContributor[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [analyzeResponse, setAnalyzeResponse] = useState("");
  const [createResponse, setCreateResponse] = useState("");
  const [verificationHint, setVerificationHint] = useState("");
  const [coverageStats, setCoverageStats] = useState<CoverageStats | null>(null);
  const [pendingClaimsOutput, setPendingClaimsOutput] = useState("");
  const [recentRepos, setRecentRepos] = useState<string[]>([]);
  const [selectedContributor, setSelectedContributor] = useState("");
  const [copiedState, setCopiedState] = useState("");

  const walletIdentity = useMemo(() => {
    if (nearAccountId && nearAccountId !== "Unknown NEAR Account") return nearAccountId;
    if (evmAddress) return evmAddress;
    return "web_user";
  }, [nearAccountId, evmAddress]);

  const walletAddressForAgent = useMemo(() => {
    if (nearAccountId && nearAccountId !== "Unknown NEAR Account") return nearAccountId;
    return evmAddress || "";
  }, [nearAccountId, evmAddress]);

  const normalizedRepo = useMemo(
    () => (repoInput.trim() ? normalizeRepoUrl(repoInput) : ""),
    [repoInput]
  );

  const repoPath = useMemo(
    () => (normalizedRepo ? parseRepoPath(normalizedRepo) : null),
    [normalizedRepo]
  );

  const pendingUnverified = useMemo(
    () => parsePendingUsernames(pendingClaimsOutput),
    [pendingClaimsOutput]
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_REPOS_KEY);
      if (raw) setRecentRepos(JSON.parse(raw));
    } catch {
      setRecentRepos([]);
    }
  }, []);

  const outreach = useMemo<OutreachBundle | null>(() => {
    if (!selectedContributor || !repoPath) return null;
    const verifyUrl = `/verify?repo=${encodeURIComponent(repoPath)}&user=${encodeURIComponent(selectedContributor)}`;
    const absoluteVerifyUrl =
      typeof window !== "undefined" ? `${window.location.origin}${verifyUrl}` : verifyUrl;

    const dmText =
      `Hi @${selectedContributor}, we are distributing contributor rewards for ${repoPath}. ` +
      `Please verify your GitHub + NEAR wallet so you can claim payouts: ${absoluteVerifyUrl}`;
    const tweetText =
      `@${selectedContributor} please verify your GitHub + NEAR wallet for ${repoPath} payouts: ${absoluteVerifyUrl}`;
    const castText =
      `@${selectedContributor} verifying wallet for ${repoPath} lets you claim GitSplits payouts: ${absoluteVerifyUrl}`;

    const issueBody =
      `We are preparing contributor payouts for \`${repoPath}\`.\n\n` +
      `If you contributed and have not linked your payout wallet yet, please verify here:\n` +
      `${absoluteVerifyUrl}\n\n` +
      `Selected contributor reminder: @${selectedContributor}`;
    const githubIssueUrl = `https://github.com/${repoPath}/issues/new?title=${encodeURIComponent(
      `Contributor payout verification for ${repoPath}`
    )}&body=${encodeURIComponent(issueBody)}`;

    const prCommentTemplate =
      `@${selectedContributor} quick heads-up: we are distributing contributor payouts for ${repoPath}. ` +
      `Please verify your GitHub + NEAR wallet at ${absoluteVerifyUrl} so your share can be claimed.`;

    return {
      verifyUrl: absoluteVerifyUrl,
      dmText,
      tweetText,
      castText,
      githubIssueUrl,
      prCommentTemplate,
    };
  }, [repoPath, selectedContributor]);

  const copyText = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedState(`${label} copied`);
      trackUxEvent("splits_copy_outreach", { label });
      setTimeout(() => setCopiedState(""), 1800);
    } catch {
      setCopiedState("Copy failed");
    }
  };

  const rememberRepo = (repo: string) => {
    const normalized = repo
      .replace(/^github\.com\//i, "")
      .replace(/\/+$/, "");
    if (!normalized) return;
    setRecentRepos((prev) => {
      const next = [normalized, ...prev.filter((item) => item !== normalized)].slice(0, 5);
      try {
        localStorage.setItem(RECENT_REPOS_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage failures.
      }
      return next;
    });
  };

  async function callAgent(text: string) {
    const response = await fetch("/api/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        userId: walletIdentity,
        walletAddress: walletAddressForAgent,
        nearAccountId: nearAccountId || undefined,
        evmAddress: evmAddress || undefined,
      }),
    });
    const data: AgentApiResponse = await response.json();
    if (!response.ok || !data.success || !data.response) {
      const msg = data.error || "Agent request failed.";
      if (msg.toLowerCase().includes("timed out")) {
        throw new Error("Agent timed out. Please retry in a few seconds.");
      }
      throw new Error(msg);
    }
    return data.response;
  }

  const analyzeRepo = async () => {
    if (!repoInput.trim()) {
      setStatus("error");
      setMessage("Repository URL is required.");
      return;
    }

    const normalizedRepo = normalizeRepoUrl(repoInput);
    rememberRepo(normalizedRepo);
    setStatus("loading");
    setMessage("");
    setAnalyzeResponse("");
    setCreateResponse("");
    setPendingClaimsOutput("");
    setContributors([]);
    setVerificationHint("");
    trackUxEvent("splits_analyze_start", { repo: normalizedRepo });

    try {
      const response = await callAgent(`analyze ${normalizedRepo}`);
      const parsed = parseContributorsFromAnalyzeResponse(response);
      const coverageLine = response
        .split("\n")
        .find((line) => line.toLowerCase().includes("verification coverage"));
      setAnalyzeResponse(response);
      setContributors(parsed);
      setSelectedContributor(parsed[0]?.githubUsername || "");
      if (coverageLine) {
        setVerificationHint(coverageLine.trim());
        const match = coverageLine.match(/(\d+)\s*\/\s*(\d+)\s+verified/i);
        setCoverageStats(
          match
            ? { verified: Number(match[1]), total: Number(match[2]) }
            : null
        );
      }
      setStatus("success");
      setMessage(
        parsed.length > 0
          ? "Repository analyzed successfully. You can create a split now."
          : "Analysis completed. Contributor table could not be fully parsed, but you can still create a split."
      );
      trackUxEvent("splits_analyze_success", {
        repo: normalizedRepo,
        contributors: parsed.length,
      });
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Failed to analyze repository.");
      setCoverageStats(null);
      trackUxEvent("splits_analyze_failed", { repo: normalizedRepo });
    }
  };

  const createSplit = async () => {
    if (!repoInput.trim()) {
      setStatus("error");
      setMessage("Repository URL is required.");
      return;
    }

    const normalizedRepo = normalizeRepoUrl(repoInput);
    rememberRepo(normalizedRepo);
    setStatus("loading");
    setMessage("Creating split via agent...");
    setCreateResponse("");
    trackUxEvent("splits_create_start", { repo: normalizedRepo });

    try {
      const response = await callAgent(`create ${normalizedRepo}`);
      setCreateResponse(response);
      setStatus("success");
      setMessage("Split creation flow completed.");
      trackUxEvent("splits_create_success", { repo: normalizedRepo });
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Failed to create split.");
      trackUxEvent("splits_create_failed", { repo: normalizedRepo });
    }
  };

  const repairSplit = async () => {
    if (!repoInput.trim()) {
      setStatus("error");
      setMessage("Repository URL is required.");
      return;
    }

    const normalizedRepo = normalizeRepoUrl(repoInput);
    rememberRepo(normalizedRepo);
    setStatus("loading");
    setMessage("Repairing split via agent...");
    setCreateResponse("");
    trackUxEvent("splits_repair_start", { repo: normalizedRepo });

    try {
      const response = await callAgent(`create ${normalizedRepo}`);
      setCreateResponse(response);
      setStatus("success");
      setMessage("Split repair flow completed.");
      trackUxEvent("splits_repair_success", { repo: normalizedRepo });
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Failed to repair split.");
      trackUxEvent("splits_repair_failed", { repo: normalizedRepo });
    }
  };

  const checkPendingClaims = async () => {
    if (!repoInput.trim()) {
      setStatus("error");
      setMessage("Repository URL is required.");
      return;
    }

    const normalized = normalizeRepoUrl(repoInput);
    rememberRepo(normalized);
    setStatus("loading");
    setMessage("Checking pending claims...");
    setPendingClaimsOutput("");
    trackUxEvent("splits_pending_start", { repo: normalized });

    try {
      const response = await callAgent(`pending ${normalized}`);
      setPendingClaimsOutput(response);
      setStatus("success");
      setMessage("Pending claims loaded.");
      trackUxEvent("splits_pending_success", { repo: normalized });
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Failed to fetch pending claims.");
      trackUxEvent("splits_pending_failed", { repo: normalized });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gentle-blue via-gentle-purple to-gentle-orange py-10">
      <div className="container mx-auto max-w-4xl px-4">
        <WalletStatusBar />

        <Card>
          <CardHeader>
            <CardTitle>Splits</CardTitle>
            <CardDescription>
              Analyze a GitHub repository and create a split through the live agent backend.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {status === "success" && message && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-700" />
                <AlertTitle>Success</AlertTitle>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}
            {status === "error" && message && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="repoUrl">GitHub Repository URL</Label>
              <Input
                id="repoUrl"
                value={repoInput}
                onChange={(e) => setRepoInput(e.target.value)}
                placeholder="https://github.com/owner/repo"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={analyzeRepo} disabled={status === "loading"}>
                {status === "loading" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing
                  </>
                ) : (
                  "Analyze Contributions"
                )}
              </Button>
              <Button variant="outline" onClick={createSplit} disabled={status === "loading"}>
                Create Split
              </Button>
              <Button variant="outline" onClick={repairSplit} disabled={status === "loading"}>
                Repair Split
              </Button>
              <Button variant="outline" onClick={checkPendingClaims} disabled={status === "loading"}>
                Check Pending
              </Button>
              {repoInput.trim() && (
                <Link
                  href={`/agent?command=${encodeURIComponent(`pay 1 USDC to ${normalizeRepoUrl(repoInput)}`)}`}
                >
                  <Button variant="secondary" type="button">Pay Now</Button>
                </Link>
              )}
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

            {verificationHint && (
              <p className="text-sm text-blue-700">{verificationHint}. Invite contributors at /verify.</p>
            )}
            {repoPath && coverageStats && coverageStats.verified < coverageStats.total && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Unverified Contributors Block Full Payout</AlertTitle>
                <AlertDescription>
                  {`${coverageStats.total - coverageStats.verified} contributor(s) still need verification. `}
                  <Link
                    href={`/verify?repo=${encodeURIComponent(repoPath)}${selectedContributor ? `&user=${encodeURIComponent(selectedContributor)}` : ""}`}
                    className="underline"
                  >
                    Send them to verification
                  </Link>
                  .
                </AlertDescription>
              </Alert>
            )}
            {coverageStats && coverageStats.verified > 0 && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-700" />
                <AlertTitle>Payout Path Is Active</AlertTitle>
                <AlertDescription>
                  {coverageStats.verified} verified contributor(s) can be paid now. Unverified contributors are routed to pending claims.
                </AlertDescription>
              </Alert>
            )}
            {repoPath && (
              <div className="rounded-md border bg-white p-3">
                <p className="text-sm font-medium">Next Best Action</p>
                {coverageStats && coverageStats.verified === 0 ? (
                  <p className="text-sm text-gray-600">
                    Start verification outreach before paying.
                    {" "}
                    <Link
                      href={`/verify?repo=${encodeURIComponent(repoPath)}${selectedContributor ? `&user=${encodeURIComponent(selectedContributor)}` : ""}`}
                      className="underline text-blue-700"
                    >
                      Open verification
                    </Link>
                  </p>
                ) : (
                  <p className="text-sm text-gray-600">
                    Contributors are payout-eligible.
                    {" "}
                    <Link
                      href={`/agent?command=${encodeURIComponent(`pay 1 USDC to github.com/${repoPath}`)}`}
                      className="underline text-blue-700"
                    >
                      Open pay command
                    </Link>
                  </p>
                )}
              </div>
            )}
            {coverageStats && (
              <div className="rounded-md border bg-white p-3 text-sm">
                <p className="font-medium">Payout Preview (1 USDC)</p>
                <p className="text-gray-600">
                  Immediate payout: {(coverageStats.verified / Math.max(coverageStats.total, 1)).toFixed(2)} USDC
                </p>
                <p className="text-gray-600">
                  Pending claims: {((coverageStats.total - coverageStats.verified) / Math.max(coverageStats.total, 1)).toFixed(2)} USDC
                </p>
              </div>
            )}

            {!isNearConnected && !isEvmConnected && (
              <p className="text-sm text-amber-700">
                Connect a wallet for best results. Without a wallet, split ownership falls back to server NEAR account.
              </p>
            )}

            <div className="rounded-md border bg-white">
              <div className="flex items-center gap-2 border-b p-3 font-medium">
                <GitBranch className="h-4 w-4" />
                Contributor Allocation
              </div>
              {contributors.length === 0 ? (
                status === "loading" ? (
                  <div className="space-y-2 p-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : (
                  <p className="p-4 text-sm text-gray-600">No contributors parsed yet.</p>
                )
              ) : (
                <>
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>GitHub User</TableHead>
                          <TableHead>Share (%)</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contributors.map((contributor) => {
                          const statusLabel = pendingUnverified.has(contributor.githubUsername)
                            ? "Unverified"
                            : "Unknown";
                          const verifyHref = `/verify?repo=${encodeURIComponent(repoPath || "")}&user=${encodeURIComponent(contributor.githubUsername)}`;
                          return (
                            <TableRow key={contributor.githubUsername}>
                              <TableCell>{contributor.githubUsername}</TableCell>
                              <TableCell>{contributor.percentage.toFixed(2)}</TableCell>
                              <TableCell>{statusLabel}</TableCell>
                              <TableCell>
                                <Link href={verifyHref} className="underline text-blue-700">
                                  Verify
                                </Link>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="space-y-2 p-3 md:hidden">
                    {contributors.map((contributor) => {
                      const statusLabel = pendingUnverified.has(contributor.githubUsername)
                        ? "Unverified"
                        : "Unknown";
                      const verifyHref = `/verify?repo=${encodeURIComponent(repoPath || "")}&user=${encodeURIComponent(contributor.githubUsername)}`;
                      return (
                        <div key={contributor.githubUsername} className="rounded border bg-gray-50 p-3">
                          <p className="font-medium">{contributor.githubUsername}</p>
                          <p className="text-sm text-gray-600">{contributor.percentage.toFixed(2)}% share</p>
                          <p className="text-sm text-gray-600">Status: {statusLabel}</p>
                          <Link href={verifyHref} className="text-sm text-blue-700 underline">
                            Verify contributor
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {contributors.length > 0 && (
              <div className="rounded-md border bg-white p-4 space-y-3">
                <p className="text-sm font-medium">Proactive Outreach Toolkit</p>
                <p className="text-xs text-gray-600">
                  Generate one-click outreach artifacts for verification and payouts.
                </p>

                <div className="space-y-2">
                  <Label htmlFor="outreachUser">Contributor</Label>
                  <select
                    id="outreachUser"
                    className="w-full rounded-md border bg-white px-3 py-2 text-sm"
                    value={selectedContributor}
                    onChange={(e) => setSelectedContributor(e.target.value)}
                  >
                    {contributors.map((c) => (
                      <option key={c.githubUsername} value={c.githubUsername}>
                        {c.githubUsername}
                      </option>
                    ))}
                  </select>
                </div>

                {outreach && (
                  <div className="space-y-3">
                    <div className="rounded border bg-gray-50 p-3 text-xs break-all">
                      Verification URL: {outreach.verifyUrl}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link href={outreach.verifyUrl}>
                        <Button type="button" size="sm">Open Verify Link</Button>
                      </Link>
                      {outreach.githubIssueUrl && (
                        <a href={outreach.githubIssueUrl} target="_blank" rel="noreferrer">
                          <Button type="button" variant="outline" size="sm">GitHub Issue Draft</Button>
                        </a>
                      )}
                      <a
                        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(outreach.tweetText)}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Button type="button" variant="outline" size="sm">Tweet Draft</Button>
                      </a>
                      <a
                        href={`https://warpcast.com/~/compose?text=${encodeURIComponent(outreach.castText)}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Button type="button" variant="outline" size="sm">Farcaster Draft</Button>
                      </a>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => copyText("DM text", outreach.dmText)}
                      >
                        Copy DM Text
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => copyText("PR comment", outreach.prCommentTemplate)}
                      >
                        Copy PR Comment Template
                      </Button>
                    </div>
                    {copiedState && <p className="text-xs text-green-700">{copiedState}</p>}
                  </div>
                )}
              </div>
            )}

            {analyzeResponse && (
              <div className="rounded-md border bg-gray-50 p-3 text-sm whitespace-pre-wrap">
                <p className="mb-2 font-medium">Analyze Response</p>
                {analyzeResponse}
              </div>
            )}

            {createResponse && (
              <div className="rounded-md border bg-gray-50 p-3 text-sm whitespace-pre-wrap">
                <p className="mb-2 font-medium">Create Response</p>
                {createResponse}
              </div>
            )}
            {pendingClaimsOutput && (
              <div className="rounded-md border bg-gray-50 p-3 text-sm whitespace-pre-wrap">
                <p className="mb-2 font-medium">Pending Claims</p>
                {pendingClaimsOutput}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
