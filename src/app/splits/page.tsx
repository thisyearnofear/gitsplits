"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAppKitAccount } from "@reown/appkit/react";
import { useNearWallet } from "@/hooks/useNearWallet";
import WalletStatusBar from "@/components/shared/WalletStatusBar";
import FlowStatusStrip from "@/components/shared/FlowStatusStrip";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, CheckCircle2, GitBranch, Loader2 } from "lucide-react";
import { trackUxEvent } from "@/lib/services/ux-events";
import { utils } from "near-api-js";

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

type ContributorStatus = {
  verified: boolean;
  walletAddress: string | null;
};

type PayReceipt = {
  distributedAmount?: string;
  verifiedCount?: number;
  totalCount?: number;
  protocol?: string;
  transactionRef?: string;
  splitId?: string;
  pendingCount?: number;
  at?: string;
};

function normalizeRepoUrl(input: string): string {
  const cleaned = input
    .trim()
    .replace(/^(https?:\/\/)?(www\.)?github\.com\//i, "")
    .replace(/\/+$/, "");
  return `github.com/${cleaned}`;
}

function toUserFacingError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error || "Unknown error");
  const lower = raw.toLowerCase();
  if (lower.includes("timed out")) return "The agent timed out. Please retry in a few seconds.";
  if (lower.includes("not installed")) return "GitHub App is not installed on this repository yet.";
  if (lower.includes("fetch") || lower.includes("network")) return "Network issue while contacting the agent. Please retry.";
  return raw;
}

function isSystemContributor(username: string): boolean {
  const normalized = String(username || "").toLowerCase();
  return normalized.includes("[bot]") || normalized.endsWith("-bot");
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

function parsePayReceipt(response: string): PayReceipt {
  const distributed = response.match(/Distributed\s+([0-9.]+\s+[A-Z0-9]+)/i);
  const coverage = response.match(/Coverage:\s+(\d+)\s*\/\s*(\d+)/i);
  const protocol = response.match(/Protocol:\s+(.+)/i);
  const tx = response.match(/Transaction:\s+(.+)/i);
  const split = response.match(/Split:\s+(.+)/i);
  const pending = response.match(/Pending claims .*?\((\d+)\)/i);

  return {
    distributedAmount: distributed?.[1]?.trim(),
    verifiedCount: coverage ? Number(coverage[1]) : undefined,
    totalCount: coverage ? Number(coverage[2]) : undefined,
    protocol: protocol?.[1]?.trim(),
    transactionRef: tx?.[1]?.trim(),
    splitId: split?.[1]?.trim(),
    pendingCount: pending ? Number(pending[1]) : undefined,
    at: new Date().toISOString(),
  };
}

export default function SplitsPage() {
  const searchParams = useSearchParams();
  const {
    isConnected: isNearConnected,
    accountId: nearAccountId,
    signAndSendTransaction,
    connect: connectNear,
  } = useNearWallet();
  const { isConnected: isEvmConnected, address: evmAddress } = useAppKitAccount();
  const [repoInput, setRepoInput] = useState("");
  const [contributors, setContributors] = useState<ParsedContributor[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [analyzeResponse, setAnalyzeResponse] = useState("");
  const [createResponse, setCreateResponse] = useState("");
  const [verificationHint, setVerificationHint] = useState("");
  const [coverageStats, setCoverageStats] = useState<CoverageStats | null>(null);
  const [contributorStatuses, setContributorStatuses] = useState<Record<string, ContributorStatus>>({});
  const [pendingClaimsOutput, setPendingClaimsOutput] = useState("");
  const [payResponse, setPayResponse] = useState("");
  const [payAmount, setPayAmount] = useState("1");
  const [payToken, setPayToken] = useState("NEAR");
  const [recentRepos, setRecentRepos] = useState<string[]>([]);
  const [selectedContributor, setSelectedContributor] = useState("");
  const [copiedState, setCopiedState] = useState("");
  const [paymentTxs, setPaymentTxs] = useState<Array<{ recipient: string; txHash: string }>>([]);

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
  const payReceipt = useMemo(() => parsePayReceipt(payResponse), [payResponse]);
  const flowSteps = useMemo(
    () => [
      { id: "analyze", label: "Analyze", href: "/agent", complete: contributors.length > 0, current: contributors.length === 0 },
      {
        id: "verify",
        label: "Verify",
        href: repoPath ? `/verify?repo=${encodeURIComponent(repoPath)}` : "/verify",
        complete: !!coverageStats && coverageStats.verified === coverageStats.total,
        current: !!coverageStats && coverageStats.verified < coverageStats.total,
      },
      { id: "split", label: "Create Split", href: "/splits", complete: !!createResponse, current: !createResponse && contributors.length > 0 },
      { id: "pay", label: "Pay", href: "/splits", complete: !!payResponse, current: !!createResponse && !payResponse },
      { id: "claim", label: "Claim", href: "/splits", complete: !!pendingClaimsOutput, current: !!payResponse && !pendingClaimsOutput },
    ],
    [contributors.length, coverageStats, repoPath, createResponse, payResponse, pendingClaimsOutput]
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_REPOS_KEY);
      if (raw) setRecentRepos(JSON.parse(raw));
    } catch {
      setRecentRepos([]);
    }
  }, []);

  useEffect(() => {
    const repo = searchParams.get("repo");
    const amount = searchParams.get("amount");
    const token = searchParams.get("token");
    if (repo) setRepoInput(repo);
    if (amount) setPayAmount(amount);
    if (token) setPayToken(token.toUpperCase());
  }, [searchParams]);

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

  async function loadContributorStatuses(usernames: string[]) {
    if (!usernames.length) {
      setContributorStatuses({});
      return;
    }
    try {
      const response = await fetch("/api/contributor-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contributors: usernames }),
      });
      const data = await response.json();
      if (!response.ok || !data?.success || !Array.isArray(data.statuses)) {
        return;
      }
      const next: Record<string, ContributorStatus> = {};
      for (const status of data.statuses) {
        next[String(status.githubUsername)] = {
          verified: Boolean(status.verified),
          walletAddress: status.walletAddress ? String(status.walletAddress) : null,
        };
      }
      setContributorStatuses(next);
    } catch {
      // Keep UI functional even if status endpoint fails.
    }
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
    setPayResponse("");
    setContributors([]);
    setContributorStatuses({});
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
      await loadContributorStatuses(parsed.map((c) => c.githubUsername));
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
      setContributorStatuses({});
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
      const coverageLine = response
        .split("\n")
        .find((line) => line.toLowerCase().includes("verification coverage"));
      if (coverageLine) {
        const match = coverageLine.match(/(\d+)\s*\/\s*(\d+)\s+verified/i);
        if (match) setCoverageStats({ verified: Number(match[1]), total: Number(match[2]) });
      }
      trackUxEvent("funnel_split_created", { repo: normalizedRepo });
      trackUxEvent("splits_create_success", { repo: normalizedRepo });
    } catch (error) {
      setStatus("error");
      setMessage(toUserFacingError(error));
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
      setMessage(toUserFacingError(error));
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

  const payNow = async () => {
    if (!repoInput.trim()) {
      setStatus("error");
      setMessage("Repository URL is required.");
      return;
    }

    const normalized = normalizeRepoUrl(repoInput);
    const amount = Number(payAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setStatus("error");
      setMessage("Pay amount must be a positive number.");
      return;
    }

    setStatus("loading");
    setMessage("Preparing wallet-signed payout...");
    setPayResponse("");
    setPaymentTxs([]);
    trackUxEvent("splits_pay_start", { repo: normalized, amount, token: payToken });

    try {
      trackUxEvent("funnel_pay_submitted", { repo: normalized, amount, token: payToken });
      if (!isNearConnected || !nearAccountId) {
        setStatus("error");
        setMessage("Connect your NEAR wallet to execute a direct payout.");
        return;
      }
      if (payToken.toUpperCase() !== "NEAR") {
        setStatus("error");
        setMessage("Direct wallet payouts currently support NEAR only. Set token to NEAR.");
        return;
      }
      if (!contributors.length) {
        setStatus("error");
        setMessage("Analyze the repository first to load contributors.");
        return;
      }

      const payoutCandidates = contributors
        .map((contributor) => {
          const liveStatus = contributorStatuses[contributor.githubUsername];
          return {
            githubUsername: contributor.githubUsername,
            percentage: contributor.percentage,
            verified: Boolean(liveStatus?.verified),
            walletAddress: liveStatus?.walletAddress || null,
          };
        })
        .filter((item) => item.verified && item.walletAddress && /\.near$|\.testnet$/i.test(item.walletAddress));

      if (!payoutCandidates.length) {
        setStatus("error");
        setMessage("No verified NEAR recipients are available for direct payout.");
        return;
      }

      const verifiedPercentage = payoutCandidates.reduce((sum, item) => sum + item.percentage, 0);
      const payouts = payoutCandidates
        .map((item) => {
          const payoutAmount = verifiedPercentage > 0 ? (amount * item.percentage) / verifiedPercentage : 0;
          return {
            ...item,
            payoutAmount,
          };
        })
        .filter((item) => item.payoutAmount > 0);

      const totalVerifiedCount = payoutCandidates.length;
      const totalContributors = contributors.length;
      const proceed = window.confirm(
        `Confirm direct payout from your NEAR wallet:\n\nRepo: ${normalized}\nAmount: ${amount} NEAR\nVerified recipients: ${totalVerifiedCount}/${totalContributors}\nSender wallet: ${nearAccountId}\n\nOnly verified NEAR recipients will be paid in this transaction set.`
      );
      if (!proceed) {
        setStatus("idle");
        setMessage("Payout cancelled.");
        return;
      }

      const txResults: Array<{ recipient: string; txHash: string }> = [];
      let distributedAmount = 0;

      for (const payout of payouts) {
        const yocto = utils.format.parseNearAmount(payout.payoutAmount.toFixed(6));
        if (!yocto || yocto === "0") continue;

        const result: any = await signAndSendTransaction(String(payout.walletAddress), [
          {
            type: "Transfer",
            params: {
              deposit: yocto,
            },
          },
        ]);

        const txHash =
          result?.transaction?.hash ||
          result?.transaction_outcome?.id ||
          result?.final_execution_outcome?.transaction?.hash ||
          "unknown";

        txResults.push({
          recipient: String(payout.walletAddress),
          txHash: String(txHash),
        });
        distributedAmount += payout.payoutAmount;
      }

      setPaymentTxs(txResults);
      const txPrimary = txResults[0]?.txHash || "n/a";
      const unverifiedCount = Math.max(totalContributors - totalVerifiedCount, 0);
      const response =
        `✅ Distributed ${distributedAmount.toFixed(4)} NEAR from wallet ${nearAccountId} to ${txResults.length} verified contributors.\n\n` +
        `Coverage: ${totalVerifiedCount}/${totalContributors} contributors verified\n` +
        `Payment mode: direct_wallet_near\n` +
        `🔗 Transaction: ${txPrimary}\n` +
        `${unverifiedCount > 0 ? `Unverified contributors not paid now: ${unverifiedCount}` : "All contributors paid in this run."}`;
      setPayResponse(response);
      setStatus("success");
      setMessage("Payout request completed.");
      trackUxEvent("funnel_pay_success", { repo: normalized, amount, token: payToken });
      trackUxEvent("splits_pay_success", { repo: normalized, amount, token: payToken });
    } catch (error) {
      setStatus("error");
      setMessage(toUserFacingError(error));
      trackUxEvent("splits_pay_failed", { repo: normalized, amount, token: payToken });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gentle-blue via-gentle-purple to-gentle-orange py-10">
      <div className="container mx-auto max-w-4xl px-4">
        <WalletStatusBar />
        <div className="mb-4">
          <FlowStatusStrip steps={flowSteps} title="Contributor Payout Journey" />
        </div>

        <Card className="mb-24 md:mb-0">
          <CardHeader>
            <CardTitle>Splits</CardTitle>
            <CardDescription>
              Analyze a GitHub repository, create a split, and pay verified contributors directly from your NEAR wallet.
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
              <div className="flex items-center gap-2 rounded border bg-white px-2 py-1">
                <Input
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="h-8 w-16 text-xs"
                  placeholder="1"
                />
                <Input
                  value={payToken}
                  onChange={(e) => setPayToken(e.target.value.toUpperCase())}
                  className="h-8 w-20 text-xs"
                  placeholder="NEAR"
                />
                <Button variant="secondary" type="button" onClick={payNow} disabled={status === "loading"}>
                  Pay from Wallet
                </Button>
              </div>
              {repoInput.trim() && (
                <Link
                  href={`/agent?command=${encodeURIComponent(`pay ${payAmount || "1"} ${payToken || "NEAR"} to ${normalizeRepoUrl(repoInput)}`)}`}
                >
                  <Button variant="outline" type="button">Open in Agent Chat</Button>
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
                  {coverageStats.verified} verified contributor(s) can be paid now from your connected NEAR wallet.
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
                      href={`/agent?command=${encodeURIComponent(`pay 1 NEAR to github.com/${repoPath}`)}`}
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
                <p className="font-medium">Payout Preview (1 NEAR)</p>
                <p className="text-gray-600">
                  Immediate payout: {(coverageStats.verified / Math.max(coverageStats.total, 1)).toFixed(2)} NEAR
                </p>
                <p className="text-gray-600">
                  Deferred until verification: {((coverageStats.total - coverageStats.verified) / Math.max(coverageStats.total, 1)).toFixed(2)} NEAR
                </p>
              </div>
            )}

            {!isNearConnected && !isEvmConnected && (
              <p className="text-sm text-amber-700">
                Connect a wallet for best results. Without a wallet, split ownership falls back to server NEAR account.
              </p>
            )}
            {!isNearConnected && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 flex items-center justify-between gap-3">
                <p className="text-sm text-amber-900">Direct payouts require a connected NEAR wallet.</p>
                <Button type="button" size="sm" onClick={connectNear}>
                  Connect NEAR
                </Button>
              </div>
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
                          const liveStatus = contributorStatuses[contributor.githubUsername];
                          const statusLabel = liveStatus
                            ? liveStatus.verified
                              ? "Verified"
                              : "Unverified"
                            : pendingUnverified.has(contributor.githubUsername)
                            ? "Unverified"
                            : "Unknown";
                          const verifyHref = `/verify?repo=${encodeURIComponent(repoPath || "")}&user=${encodeURIComponent(contributor.githubUsername)}`;
                          const isBot = isSystemContributor(contributor.githubUsername);
                          return (
                            <TableRow key={contributor.githubUsername}>
                              <TableCell>
                                {contributor.githubUsername}
                                {isBot ? " (bot/system)" : ""}
                              </TableCell>
                              <TableCell>{contributor.percentage.toFixed(2)}</TableCell>
                              <TableCell>
                                {isBot ? "Non-payout account" : statusLabel}
                                {liveStatus?.walletAddress ? ` (${liveStatus.walletAddress})` : ""}
                              </TableCell>
                              <TableCell>
                                {isBot ? (
                                  <span className="text-xs text-gray-500">N/A</span>
                                ) : (
                                  <Link href={verifyHref} className="underline text-blue-700">
                                    Verify
                                  </Link>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="space-y-2 p-3 md:hidden">
                    {contributors.map((contributor) => {
                      const liveStatus = contributorStatuses[contributor.githubUsername];
                      const statusLabel = liveStatus
                        ? liveStatus.verified
                          ? "Verified"
                          : "Unverified"
                        : pendingUnverified.has(contributor.githubUsername)
                        ? "Unverified"
                        : "Unknown";
                      const verifyHref = `/verify?repo=${encodeURIComponent(repoPath || "")}&user=${encodeURIComponent(contributor.githubUsername)}`;
                      const isBot = isSystemContributor(contributor.githubUsername);
                      return (
                        <div key={contributor.githubUsername} className="rounded border bg-gray-50 p-3">
                          <p className="font-medium">{contributor.githubUsername}{isBot ? " (bot/system)" : ""}</p>
                          <p className="text-sm text-gray-600">{contributor.percentage.toFixed(2)}% share</p>
                          <p className="text-sm text-gray-600">
                            Status: {isBot ? "Non-payout account" : statusLabel}{liveStatus?.walletAddress ? ` (${liveStatus.walletAddress})` : ""}
                          </p>
                          {!isBot && (
                            <Link href={verifyHref} className="text-sm text-blue-700 underline">
                              Verify contributor
                            </Link>
                          )}
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
            {payResponse && (
              <div className="rounded-md border bg-white p-4 text-sm space-y-2">
                <p className="font-medium">Payout Receipt</p>
                <p>Distributed: {payReceipt.distributedAmount || "n/a"}</p>
                <p>
                  Coverage:{" "}
                  {payReceipt.verifiedCount !== undefined && payReceipt.totalCount !== undefined
                    ? `${payReceipt.verifiedCount}/${payReceipt.totalCount}`
                    : "n/a"}
                </p>
                <p>Protocol: {payReceipt.protocol || "n/a"}</p>
                <p>Transaction: {payReceipt.transactionRef || "n/a"}</p>
                <p>Split: {payReceipt.splitId || "n/a"}</p>
                <p>Pending claims created: {payReceipt.pendingCount ?? 0}</p>
                <p>Timestamp: {payReceipt.at ? new Date(payReceipt.at).toLocaleString() : "n/a"}</p>
                {paymentTxs.length > 0 && (
                  <div className="rounded border bg-gray-50 p-2 space-y-1">
                    <p className="font-medium">Signed NEAR transactions</p>
                    {paymentTxs.map((tx) => (
                      <p key={`${tx.recipient}-${tx.txHash}`} className="text-xs break-all">
                        {tx.recipient}:{" "}
                        <a
                          className="underline text-blue-700"
                          href={`https://nearblocks.io/txns/${tx.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {tx.txHash}
                        </a>
                      </p>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={checkPendingClaims}>
                    View Pending Claims
                  </Button>
                  {repoPath && (
                    <Link href={`/agent?command=${encodeURIComponent(`pending github.com/${repoPath}`)}`}>
                      <Button type="button" variant="outline" size="sm">Open Claim View</Button>
                    </Link>
                  )}
                </div>
                <div className="rounded border bg-gray-50 p-2 whitespace-pre-wrap">{payResponse}</div>
              </div>
            )}
            {pendingClaimsOutput && (
              <div className="rounded-md border bg-gray-50 p-3 text-sm whitespace-pre-wrap">
                <p className="mb-2 font-medium">Pending Claims</p>
                {pendingClaimsOutput}
              </div>
            )}

            <div className="rounded-md border bg-white p-4 space-y-2 text-sm">
              <p className="font-medium">Need Help?</p>
              <p>
                GitHub app/analysis issues:
                {" "}
                <Link href="/agent" className="underline text-blue-700">open agent chat</Link>
                {" "}
                and run <code>analyze owner/repo</code>.
              </p>
              <p>
                Contributor not receiving payout:
                {" "}
                <Link
                  href={`/verify${repoPath ? `?repo=${encodeURIComponent(repoPath)}${selectedContributor ? `&user=${encodeURIComponent(selectedContributor)}` : ""}` : ""}`}
                  className="underline text-blue-700"
                >
                  open verification link
                </Link>
                .
              </p>
              <p>
                Timeout/retry:
                {" "}
                <Button type="button" variant="outline" size="sm" onClick={analyzeRepo}>
                  Retry analyze
                </Button>
              </p>
            </div>
          </CardContent>
        </Card>
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t p-3">
          <div className="max-w-4xl mx-auto flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={analyzeRepo}
              disabled={status === "loading"}
            >
              Analyze
            </Button>
            <Button
              type="button"
              className="flex-1"
              onClick={payNow}
              disabled={status === "loading" || !repoInput.trim()}
            >
              Pay
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
