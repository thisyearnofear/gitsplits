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
import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp, GitBranch, Loader2, Mail, Megaphone, MessageSquare } from "lucide-react";
import { trackUxEvent } from "@/lib/services/ux-events";
import { utils } from "near-api-js";

type ParsedContributor = {
  githubUsername: string;
  percentage: number;
};

type ContributorAllocation = {
  included: boolean;
  share: number;
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
  const [allocationDraft, setAllocationDraft] = useState<Record<string, ContributorAllocation>>({});
  const [showOutreach, setShowOutreach] = useState(false);
  const [showAllocation, setShowAllocation] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

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
  const payoutAmountNumber = useMemo(() => Number(payAmount), [payAmount]);
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

  useEffect(() => {
    const next: Record<string, ContributorAllocation> = {};
    for (const contributor of contributors) {
      const isBot = isSystemContributor(contributor.githubUsername);
      next[contributor.githubUsername] = {
        included: !isBot,
        share: contributor.percentage,
      };
    }
    setAllocationDraft(next);
  }, [contributors]);

  useEffect(() => {
    const unverifiedCount = coverageStats
      ? Math.max(coverageStats.total - coverageStats.verified, 0)
      : 0;
    if (unverifiedCount > 0) {
      setShowOutreach(true);
    }
  }, [coverageStats]);

  const setContributorIncluded = (username: string, included: boolean) => {
    setAllocationDraft((prev) => ({
      ...prev,
      [username]: {
        included,
        share: prev[username]?.share ?? contributors.find((c) => c.githubUsername === username)?.percentage ?? 0,
      },
    }));
  };

  const setContributorShare = (username: string, share: number) => {
    const safeShare = Number.isFinite(share) ? Math.max(0, share) : 0;
    setAllocationDraft((prev) => ({
      ...prev,
      [username]: {
        included: prev[username]?.included ?? true,
        share: safeShare,
      },
    }));
  };

  const setIncludeMode = (mode: "all" | "verified" | "none") => {
    setAllocationDraft((prev) => {
      const next: Record<string, ContributorAllocation> = { ...prev };
      for (const contributor of contributors) {
        const isBot = isSystemContributor(contributor.githubUsername);
        const status = contributorStatuses[contributor.githubUsername];
        const isVerified = Boolean(status?.verified);
        const current = prev[contributor.githubUsername];
        next[contributor.githubUsername] = {
          included:
            mode === "none"
              ? false
              : mode === "verified"
              ? !isBot && isVerified
              : !isBot,
          share: current?.share ?? contributor.percentage,
        };
      }
      return next;
    });
  };

  const resetAllocationToGitHistory = () => {
    setAllocationDraft(() => {
      const next: Record<string, ContributorAllocation> = {};
      for (const contributor of contributors) {
        const isBot = isSystemContributor(contributor.githubUsername);
        next[contributor.githubUsername] = {
          included: !isBot,
          share: contributor.percentage,
        };
      }
      return next;
    });
  };

  const allocationCandidates = useMemo(() => {
    return contributors.map((contributor) => {
      const draft = allocationDraft[contributor.githubUsername];
      const share = draft?.share ?? contributor.percentage;
      const included = draft?.included ?? !isSystemContributor(contributor.githubUsername);
      const status = contributorStatuses[contributor.githubUsername];
      const verified = Boolean(status?.verified);
      return {
        githubUsername: contributor.githubUsername,
        share,
        included,
        verified,
        walletAddress: status?.walletAddress || null,
        isBot: isSystemContributor(contributor.githubUsername),
      };
    });
  }, [allocationDraft, contributorStatuses, contributors]);

  const livePayoutPreview = useMemo(() => {
    const valid = allocationCandidates.filter(
      (c) => c.included && c.verified && c.walletAddress && /\.near$|\.testnet$/i.test(c.walletAddress)
    );
    const shareTotal = valid.reduce((sum, c) => sum + c.share, 0);
    const amount = Number.isFinite(payoutAmountNumber) ? payoutAmountNumber : 0;
    return valid.map((item) => ({
      ...item,
      payoutAmount: shareTotal > 0 ? (amount * item.share) / shareTotal : 0,
    }));
  }, [allocationCandidates, payoutAmountNumber]);

  const includedCount = allocationCandidates.filter((c) => c.included).length;
  const payableNowCount = livePayoutPreview.length;

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

      const payoutCandidates = allocationCandidates
        .filter((item) => item.included)
        .filter((item) => item.verified && item.walletAddress && /\.near$|\.testnet$/i.test(item.walletAddress));

      if (!payoutCandidates.length) {
        setStatus("error");
        setMessage("No included verified NEAR recipients are available for direct payout.");
        return;
      }

      const verifiedPercentage = payoutCandidates.reduce((sum, item) => sum + item.share, 0);
      const payouts = payoutCandidates
        .map((item) => {
          const payoutAmount = verifiedPercentage > 0 ? (amount * item.share) / verifiedPercentage : 0;
          return {
            ...item,
            payoutAmount,
          };
        })
        .filter((item) => item.payoutAmount > 0);

      const totalVerifiedCount = payoutCandidates.length;
      const totalContributors = allocationCandidates.filter((c) => c.included).length;
      const proceed = window.confirm(
        `Confirm direct payout from your NEAR wallet:\n\nRepo: ${normalized}\nAmount: ${amount} NEAR\nSelected contributors: ${totalContributors}\nPayable now: ${totalVerifiedCount}/${totalContributors}\nSender wallet: ${nearAccountId}\n\nOnly included + verified NEAR recipients will be paid in this run.`
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

  const hasRepoInput = repoInput.trim().length > 0;
  const hasAnalyzed = contributors.length > 0;
  const hasSplitContext = createResponse.trim().length > 0;
  const hasPaid = payResponse.trim().length > 0;
  const canCreateSplitNow = hasRepoInput && hasAnalyzed;
  const canPayFromWalletNow =
    hasRepoInput &&
    hasAnalyzed &&
    isNearConnected &&
    payToken.toUpperCase() === "NEAR" &&
    livePayoutPreview.length > 0;
  const unverifiedContributorCount = coverageStats
    ? Math.max(coverageStats.total - coverageStats.verified, 0)
    : 0;
  const verificationLink = repoPath
    ? `/verify?repo=${encodeURIComponent(repoPath)}${selectedContributor ? `&user=${encodeURIComponent(selectedContributor)}` : ""}`
    : "/verify";

  const nextAction = useMemo(() => {
    if (!hasRepoInput) {
      return {
        label: "Enter a Repository",
        hint: "Start by pasting owner/repo or a GitHub URL.",
        onClick: () => {},
        disabled: true,
      };
    }
    if (!hasAnalyzed) {
      return {
        label: "Analyze Contributions",
        hint: "Discover contributors and default split percentages.",
        onClick: analyzeRepo,
        disabled: status === "loading",
      };
    }
    if (!hasSplitContext) {
      return {
        label: "Create or Refresh Split",
        hint: "Create a payout split before funding.",
        onClick: createSplit,
        disabled: status === "loading",
      };
    }
    if (!isNearConnected) {
      return {
        label: "Connect NEAR Wallet",
        hint: "Direct payouts require your NEAR wallet signature.",
        onClick: connectNear,
        disabled: status === "loading",
      };
    }
    if (!canPayFromWalletNow) {
      return {
        label: "Adjust Recipients or Amount",
        hint: "Include verified NEAR recipients and set a valid amount.",
        onClick: () => {},
        disabled: true,
      };
    }
    if (!hasPaid) {
      return {
        label: "Pay from Wallet",
        hint: "Sign transactions and distribute funds now.",
        onClick: payNow,
        disabled: status === "loading",
      };
    }
    return {
      label: "Review Pending Claims",
      hint: "Track contributors still waiting for verification.",
      onClick: checkPendingClaims,
      disabled: status === "loading",
    };
  }, [
    canPayFromWalletNow,
    connectNear,
    createSplit,
    hasAnalyzed,
    hasPaid,
    hasRepoInput,
    hasSplitContext,
    isNearConnected,
    payNow,
    status,
    checkPendingClaims,
    analyzeRepo,
  ]);

  return (
    <div className="min-h-screen page-gradient py-10">
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
            <div className="rounded-md border bg-card p-4 space-y-3">
              <p className="text-sm font-semibold">Guided Flow</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div className={`rounded px-2 py-1 border ${hasAnalyzed ? "border-green-300 bg-green-50 text-green-800" : "border-border bg-muted text-muted-foreground"}`}>
                  {hasAnalyzed ? "✓" : "1."} Analyze
                </div>
                <div className={`rounded px-2 py-1 border ${hasSplitContext ? "border-green-300 bg-green-50 text-green-800" : "border-border bg-muted text-muted-foreground"}`}>
                  {hasSplitContext ? "✓" : "2."} Split
                </div>
                <div className={`rounded px-2 py-1 border ${hasPaid ? "border-green-300 bg-green-50 text-green-800" : "border-border bg-muted text-muted-foreground"}`}>
                  {hasPaid ? "✓" : "3."} Fund & Pay
                </div>
                <div className={`rounded px-2 py-1 border ${pendingClaimsOutput ? "border-green-300 bg-green-50 text-green-800" : "border-border bg-muted text-muted-foreground"}`}>
                  {pendingClaimsOutput ? "✓" : "4."} Claims
                </div>
              </div>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <p className="text-xs text-muted-foreground">{nextAction.hint}</p>
                <Button
                  type="button"
                  onClick={nextAction.onClick}
                  disabled={nextAction.disabled}
                  className="md:min-w-48"
                >
                  {nextAction.label}
                </Button>
              </div>
            </div>

            {status === "success" && message && (
              <Alert className="bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800">
                <CheckCircle2 className="h-4 w-4 text-green-700 dark:text-green-400" />
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

            <div className="space-y-3">
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
                <Button variant="outline" onClick={createSplit} disabled={status === "loading" || !canCreateSplitNow}>
                  Create or Refresh Split
                </Button>
                <div className="flex items-center gap-2 rounded border bg-card px-2 py-1">
                  <Input
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="h-8 w-20 text-xs"
                    placeholder="1"
                  />
                  <Input
                    value={payToken}
                    onChange={(e) => setPayToken(e.target.value.toUpperCase())}
                    className="h-8 w-20 text-xs"
                    placeholder="NEAR"
                  />
                  <Button variant="secondary" type="button" onClick={payNow} disabled={status === "loading" || !canPayFromWalletNow}>
                    Pay from Wallet
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  type="button"
                  className="text-xs"
                  onClick={() => setShowMoreOptions((prev) => !prev)}
                >
                  {showMoreOptions ? (
                    <>
                      Hide options <ChevronUp className="ml-1 h-3.5 w-3.5" />
                    </>
                  ) : (
                    <>
                      More options <ChevronDown className="ml-1 h-3.5 w-3.5" />
                    </>
                  )}
                </Button>
              </div>
              {showMoreOptions && (
                <div className="flex flex-wrap gap-2 rounded-md border bg-muted/30 p-2">
                  <Button variant="outline" onClick={repairSplit} disabled={status === "loading" || !hasRepoInput}>
                    Repair Split
                  </Button>
                  <Button variant="outline" onClick={checkPendingClaims} disabled={status === "loading" || !hasRepoInput}>
                    Check Pending
                  </Button>
                  <div className="flex items-center gap-1 rounded border bg-card px-2 py-1">
                    {[1, 5, 10, 25].map((preset) => (
                      <Button
                        key={preset}
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs"
                        onClick={() => setPayAmount(String(preset))}
                      >
                        {preset}
                      </Button>
                    ))}
                  </div>
                  {repoInput.trim() && (
                    <Link
                      href={`/agent?command=${encodeURIComponent(`pay ${payAmount || "1"} ${payToken || "NEAR"} to ${normalizeRepoUrl(repoInput)}`)}`}
                    >
                      <Button variant="outline" type="button">Open in Agent Chat</Button>
                    </Link>
                  )}
                </div>
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
              <p className="text-sm text-blue-700 dark:text-blue-400">{verificationHint}. Invite contributors at /verify.</p>
            )}
            {repoPath && coverageStats && coverageStats.verified < coverageStats.total && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Unverified Contributors Block Full Payout</AlertTitle>
                <AlertDescription>
                  {`${coverageStats.total - coverageStats.verified} contributor(s) still need verification. `}
                  <Link
                    href={verificationLink}
                    className="underline"
                  >
                    Send them to verification
                  </Link>
                  .
                </AlertDescription>
              </Alert>
            )}
            {coverageStats && coverageStats.verified > 0 && (
              <Alert className="bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800">
                <CheckCircle2 className="h-4 w-4 text-green-700 dark:text-green-400" />
                <AlertTitle>Payout Path Is Active</AlertTitle>
                <AlertDescription>
                  {coverageStats.verified} verified contributor(s) can be paid now from your connected NEAR wallet.
                </AlertDescription>
              </Alert>
            )}
            {repoPath && (
              <div className="rounded-md border bg-card p-3">
                <p className="text-sm font-medium">Next Best Action</p>
                {coverageStats && coverageStats.verified === 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Start verification outreach before paying.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Link href={verificationLink}>
                        <Button size="sm" type="button">Open Verification Hub</Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="outline"
                        type="button"
                        onClick={() => copyText("Verification link", `${typeof window !== "undefined" ? window.location.origin : "https://gitsplits.vercel.app"}${verificationLink}`)}
                      >
                        <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                        Copy Invite Link
                      </Button>
                      <a
                        href={`mailto:?subject=${encodeURIComponent(`Verify for ${repoPath} contributor payouts`)}&body=${encodeURIComponent(`Please verify your GitHub + NEAR identity to receive payouts: ${typeof window !== "undefined" ? window.location.origin : "https://gitsplits.vercel.app"}${verificationLink}`)}`}
                      >
                        <Button size="sm" variant="outline" type="button">
                          <Mail className="h-3.5 w-3.5 mr-1.5" />
                          Email Draft
                        </Button>
                      </a>
                      <a
                        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Contributors for ${repoPath}: verify to receive payouts ${typeof window !== "undefined" ? window.location.origin : "https://gitsplits.vercel.app"}${verificationLink}`)}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Button size="sm" variant="outline" type="button">
                          <Megaphone className="h-3.5 w-3.5 mr-1.5" />
                          Social Post
                        </Button>
                      </a>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Contributors are payout-eligible.
                    {" "}
                    <Link
                      href={`/agent?command=${encodeURIComponent(`pay 1 NEAR to github.com/${repoPath}`)}`}
                      className="underline text-blue-700 dark:text-blue-400"
                    >
                      Open pay command
                    </Link>
                  </p>
                )}
              </div>
            )}
            {coverageStats && (
              <div className="rounded-md border bg-card p-3 text-sm">
                <p className="font-medium">Flow Snapshot</p>
                <p className="text-muted-foreground">
                  Verified now: {coverageStats.verified}/{coverageStats.total} contributors
                </p>
                <p className="text-muted-foreground">
                  Included in payout draft: {includedCount}
                </p>
                <p className="text-muted-foreground">
                  Payable immediately: {payableNowCount}
                </p>
              </div>
            )}

            {!isNearConnected && !isEvmConnected && (
              <p className="text-sm text-amber-700 dark:text-amber-400">
                Connect a wallet for best results. Without a wallet, split ownership falls back to server NEAR account.
              </p>
            )}
            {!isNearConnected && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 flex items-center justify-between gap-3 dark:border-amber-800 dark:bg-amber-950/30">
                <p className="text-sm text-amber-900 dark:text-amber-200">Direct payouts require a connected NEAR wallet.</p>
                <Button type="button" size="sm" onClick={connectNear}>
                  Connect NEAR
                </Button>
              </div>
            )}

            <div className="rounded-md border bg-card">
              <button
                type="button"
                className="w-full flex items-center justify-between gap-2 border-b border-border p-3 font-medium text-left"
                onClick={() => setShowAllocation((prev) => !prev)}
              >
                <span className="flex items-center gap-2">
                  <GitBranch className="h-4 w-4" />
                  Contributor Allocation
                </span>
                {showAllocation ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {showAllocation && contributors.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2 text-xs">
                  <div className="text-muted-foreground">
                    Included: {includedCount}/{contributors.length} · Payable now: {payableNowCount}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => setIncludeMode("all")}>
                      Include All
                    </Button>
                    <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => setIncludeMode("verified")}>
                      Verified Only
                    </Button>
                    <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={resetAllocationToGitHistory}>
                      Reset Shares
                    </Button>
                    <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => setIncludeMode("none")}>
                      Clear
                    </Button>
                  </div>
                </div>
              )}
              {showAllocation && (contributors.length === 0 ? (
                status === "loading" ? (
                  <div className="space-y-2 p-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : (
                  <p className="p-4 text-sm text-muted-foreground">No contributors parsed yet.</p>
                )
              ) : (
                <>
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Include</TableHead>
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
                          const draft = allocationDraft[contributor.githubUsername];
                          const included = draft?.included ?? !isBot;
                          const share = draft?.share ?? contributor.percentage;
                          return (
                            <TableRow key={contributor.githubUsername}>
                              <TableCell>
                                <input
                                  type="checkbox"
                                  checked={included}
                                  disabled={isBot}
                                  onChange={(e) => setContributorIncluded(contributor.githubUsername, e.target.checked)}
                                />
                              </TableCell>
                              <TableCell>
                                {contributor.githubUsername}
                                {isBot ? " (bot/system)" : ""}
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={String(Number(share.toFixed(2)))}
                                  onChange={(e) => setContributorShare(contributor.githubUsername, Number(e.target.value))}
                                  disabled={!included || isBot}
                                  className="h-8 w-24 text-xs"
                                />
                              </TableCell>
                              <TableCell>
                                {isBot ? "Non-payout account" : statusLabel}
                                {liveStatus?.walletAddress ? ` (${liveStatus.walletAddress})` : ""}
                              </TableCell>
                              <TableCell>
                                {isBot ? (
                                  <span className="text-xs text-muted-foreground">N/A</span>
                                ) : (
                                  <Link href={verifyHref} className="underline text-blue-700 dark:text-blue-400">
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
                      const draft = allocationDraft[contributor.githubUsername];
                      const included = draft?.included ?? !isBot;
                      const share = draft?.share ?? contributor.percentage;
                      return (
                        <div key={contributor.githubUsername} className="rounded border bg-muted p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium">{contributor.githubUsername}{isBot ? " (bot/system)" : ""}</p>
                            <label className="text-xs flex items-center gap-1">
                              <input
                                type="checkbox"
                                checked={included}
                                disabled={isBot}
                                onChange={(e) => setContributorIncluded(contributor.githubUsername, e.target.checked)}
                              />
                              Include
                            </label>
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Share %</span>
                            <Input
                              value={String(Number(share.toFixed(2)))}
                              onChange={(e) => setContributorShare(contributor.githubUsername, Number(e.target.value))}
                              disabled={!included || isBot}
                              className="h-8 w-24 text-xs"
                            />
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Status: {isBot ? "Non-payout account" : statusLabel}{liveStatus?.walletAddress ? ` (${liveStatus.walletAddress})` : ""}
                          </p>
                          {!isBot && (
                            <Link href={verifyHref} className="text-sm text-blue-700 dark:text-blue-400 underline">
                              Verify contributor
                            </Link>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              ))}
            </div>

            {contributors.length > 0 && (
              <div className="rounded-md border bg-card p-4 space-y-2 text-sm">
                <p className="font-medium">Live Payout Preview ({Number.isFinite(payoutAmountNumber) ? payoutAmountNumber : 0} NEAR)</p>
                {livePayoutPreview.length === 0 ? (
                  <p className="text-muted-foreground text-xs">
                    No included + verified NEAR recipients yet. Adjust inclusion or complete verification.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {livePayoutPreview.map((item) => (
                      <p key={item.githubUsername} className="text-xs">
                        @{item.githubUsername}: {item.payoutAmount.toFixed(4)} NEAR
                      </p>
                    ))}
                    <p className="text-xs pt-1 text-muted-foreground">
                      Total now: {livePayoutPreview.reduce((sum, item) => sum + item.payoutAmount, 0).toFixed(4)} NEAR
                    </p>
                  </div>
                )}
              </div>
            )}

            {contributors.length > 0 && (
              <div className="rounded-md border bg-card p-4 space-y-3">
                <button
                  type="button"
                  className="w-full flex items-center justify-between text-left"
                  onClick={() => setShowOutreach((prev) => !prev)}
                >
                  <span className="text-sm font-medium">Verification Outreach Toolkit</span>
                  {showOutreach ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                <p className="text-xs text-muted-foreground">
                  Send targeted invites via link, email, social, issue, or DM copy.
                </p>

                {showOutreach && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="outreachUser">Contributor</Label>
                      <select
                        id="outreachUser"
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
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
                        <div className="rounded border bg-muted p-3 text-xs break-all">
                          Verification URL: {outreach.verifyUrl}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Link href={outreach.verifyUrl}>
                            <Button type="button" size="sm">Open Verify Link</Button>
                          </Link>
                          <a href={`mailto:?subject=${encodeURIComponent(`Verification needed for ${repoPath || "repository"} payouts`)}&body=${encodeURIComponent(outreach.dmText)}`}>
                            <Button type="button" variant="outline" size="sm">Email Draft</Button>
                          </a>
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
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => copyText("Invite package", `${outreach.dmText}\n\n${outreach.prCommentTemplate}`)}
                          >
                            Copy Invite Package
                          </Button>
                        </div>
                        {copiedState && <p className="text-xs text-green-700 dark:text-green-400">{copiedState}</p>}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {(analyzeResponse || createResponse || pendingClaimsOutput) && (
              <div className="rounded-md border bg-card p-3 space-y-3">
                <button
                  type="button"
                  className="w-full flex items-center justify-between text-left"
                  onClick={() => setShowTechnicalDetails((prev) => !prev)}
                >
                  <span className="text-sm font-medium">Advanced Details</span>
                  {showTechnicalDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {showTechnicalDetails && (
                  <div className="space-y-3">
                    {analyzeResponse && (
                      <div className="rounded-md border bg-muted p-3 text-sm whitespace-pre-wrap break-all">
                        <p className="mb-2 font-medium">Analysis Details</p>
                        {analyzeResponse}
                      </div>
                    )}
                    {createResponse && (
                      <div className="rounded-md border bg-muted p-3 text-sm whitespace-pre-wrap break-all">
                        <p className="mb-2 font-medium">Split Details</p>
                        {createResponse}
                      </div>
                    )}
                    {pendingClaimsOutput && (
                      <div className="rounded-md border bg-muted p-3 text-sm whitespace-pre-wrap break-all">
                        <p className="mb-2 font-medium">Pending Claims</p>
                        {pendingClaimsOutput}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            {payResponse && (
              <div className="rounded-md border bg-card p-4 text-sm space-y-2">
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
                  <div className="rounded border bg-muted p-2 space-y-1">
                    <p className="font-medium">Signed NEAR transactions</p>
                    {paymentTxs.map((tx) => (
                      <p key={`${tx.recipient}-${tx.txHash}`} className="text-xs break-all">
                        {tx.recipient}:{" "}
                        <a
                          className="underline text-blue-700 dark:text-blue-400"
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
                <div className="rounded border bg-muted p-2 whitespace-pre-wrap break-all">{payResponse}</div>
              </div>
            )}
            <div className="rounded-md border bg-card p-4 space-y-2 text-sm">
              <button
                type="button"
                className="w-full flex items-center justify-between text-left font-medium"
                onClick={() => setShowHelp((prev) => !prev)}
              >
                <span>Need Help?</span>
                {showHelp ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {showHelp && (
                <>
                  <p>
                    GitHub app/analysis issues:
                    {" "}
                    <Link href="/agent" className="underline text-blue-700 dark:text-blue-400">open agent chat</Link>
                    {" "}
                    and run <code>analyze owner/repo</code>.
                  </p>
                  <p>
                    Contributor not receiving payout:
                    {" "}
                    <Link
                      href={verificationLink}
                      className="underline text-blue-700 dark:text-blue-400"
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
                </>
              )}
            </div>
          </CardContent>
        </Card>
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur border-t border-border p-3">
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
