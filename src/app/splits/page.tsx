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
type PaymentOutcome = "pay_now" | "awaiting_verification" | "blocked_rule" | "excluded";

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

type ContributorReputation = {
  kind: "human" | "agent" | "unknown";
  score: number | null;
  tier: "bronze" | "silver" | "gold" | "unknown";
  erc8004Registered: boolean;
  raw: string;
};

type PayReceipt = {
  distributedAmount?: string;
  verifiedCount?: number;
  totalCount?: number;
  engine?: string;
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
      const patterns = [
        /^[^a-zA-Z0-9@]*@?([a-zA-Z0-9_.-]+):.*\((\d+(?:\.\d+)?)%\)/,
        /^[^a-zA-Z0-9@]*@?([a-zA-Z0-9_.-]+)\s*[-–—]\s*(\d+(?:\.\d+)?)%/,
      ];
      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match) {
          return {
            githubUsername: match[1],
            percentage: Number(match[2]),
          };
        }
      }
      return null;
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
  const engine = response.match(/Payment mode:\s+(.+)/i);
  const protocol = response.match(/Protocol:\s+(.+)/i);
  const tx = response.match(/Transaction:\s+(.+)/i);
  const split = response.match(/Split:\s+(.+)/i);
  const pending = response.match(/Pending claims .*?\((\d+)\)/i);

  return {
    distributedAmount: distributed?.[1]?.trim(),
    verifiedCount: coverage ? Number(coverage[1]) : undefined,
    totalCount: coverage ? Number(coverage[2]) : undefined,
    engine: engine?.[1]?.trim(),
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
  const [contributorReputation, setContributorReputation] = useState<Record<string, ContributorReputation>>({});
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
  const [paymentMode, setPaymentMode] = useState<"verified_now" | "hold_all">("verified_now");
  const [experienceMode, setExperienceMode] = useState<"guided" | "hands_off">("guided");
  const [isSyncingExperienceMode, setIsSyncingExperienceMode] = useState(false);
  const [isLoadingStatuses, setIsLoadingStatuses] = useState(false);
  const [isLoadingReputation, setIsLoadingReputation] = useState(false);
  const [showPaymentSuccessPulse, setShowPaymentSuccessPulse] = useState(false);
  const paySectionId = "fund-pay-step";
  const REPUTATION_MIN_PAYOUT_SCORE = 50;

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

  useEffect(() => {
    if (!showPaymentSuccessPulse) return;
    const timer = setTimeout(() => setShowPaymentSuccessPulse(false), 2400);
    return () => clearTimeout(timer);
  }, [showPaymentSuccessPulse]);

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
      const reputation = contributorReputation[contributor.githubUsername];
      const isBot = isSystemContributor(contributor.githubUsername);
      const meetsReputation =
        !reputation ||
        reputation.score === null ||
        reputation.score >= REPUTATION_MIN_PAYOUT_SCORE ||
        reputation.erc8004Registered;
      const walletLooksNear = /\.near$|\.testnet$/i.test(status?.walletAddress || "");
      const payoutEligible =
        included &&
        verified &&
        Boolean(status?.walletAddress) &&
        walletLooksNear &&
        meetsReputation;
      let blockedReason = "";
      if (!included) blockedReason = "Excluded by allocation";
      else if (isBot) blockedReason = "Bot/system contributor";
      else if (!verified) blockedReason = "Not verified yet";
      else if (!status?.walletAddress) blockedReason = "No linked wallet";
      else if (!walletLooksNear) blockedReason = "Wallet is not NEAR";
      else if (!meetsReputation) blockedReason = "Below payout reputation threshold";
      return {
        githubUsername: contributor.githubUsername,
        share,
        included,
        verified,
        walletAddress: status?.walletAddress || null,
        isBot,
        reputation,
        payoutEligible,
        blockedReason,
      };
    });
  }, [allocationDraft, contributorStatuses, contributorReputation, contributors]);

  const livePayoutPreview = useMemo(() => {
    const valid = allocationCandidates.filter((c) => c.payoutEligible);
    const shareTotal = valid.reduce((sum, c) => sum + c.share, 0);
    const amount = Number.isFinite(payoutAmountNumber) ? payoutAmountNumber : 0;
    return valid.map((item) => ({
      ...item,
      payoutAmount: shareTotal > 0 ? (amount * item.share) / shareTotal : 0,
    }));
  }, [allocationCandidates, payoutAmountNumber]);
  const paymentSimulationRows = useMemo(() => {
    const amount = Number.isFinite(payoutAmountNumber) ? payoutAmountNumber : 0;
    const included = allocationCandidates.filter((c) => c.included);
    const includedShareTotal = included.reduce((sum, item) => sum + item.share, 0);
    return allocationCandidates.map((item) => {
      const draftAmount =
        includedShareTotal > 0 && item.included ? (amount * item.share) / includedShareTotal : 0;
      const outcome: PaymentOutcome = !item.included
        ? "excluded"
        : item.payoutEligible
        ? "pay_now"
        : item.verified
        ? "blocked_rule"
        : "awaiting_verification";
      return {
        ...item,
        draftAmount,
        outcome,
      };
    });
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

  const focusPayStep = () => {
    if (typeof window === "undefined") return;
    const el = document.getElementById(paySectionId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const getVerificationInviteUrl = (githubUsername: string) => {
    const base =
      typeof window !== "undefined" ? window.location.origin : "https://gitsplits.vercel.app";
    const repoQuery = repoPath ? `?repo=${encodeURIComponent(repoPath)}` : "?";
    const sep = repoQuery.includes("?") && repoQuery.length > 1 ? "&" : "";
    return `${base}/verify${repoQuery}${sep}user=${encodeURIComponent(githubUsername)}`;
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

  const parseReputationResponse = (response: string): ContributorReputation => {
    const kindMatch = response.match(/Kind:\s*(human|agent|unknown)/i);
    const scoreMatch = response.match(/Score:\s*(\d+)\s*\/\s*100\s*\((bronze|silver|gold)\)/i);
    const ercLine = response.match(/ERC-8004:\s*(.+)/i)?.[1] || "";
    const erc8004Registered = /registered/i.test(ercLine) && !/not registered/i.test(ercLine);
    return {
      kind: (kindMatch?.[1]?.toLowerCase() as any) || "unknown",
      score: scoreMatch ? Number(scoreMatch[1]) : null,
      tier: (scoreMatch?.[2]?.toLowerCase() as any) || "unknown",
      erc8004Registered,
      raw: response,
    };
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
    setIsLoadingStatuses(true);
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
    } finally {
      setIsLoadingStatuses(false);
    }
  }

  async function loadContributorReputation(usernames: string[]) {
    if (!usernames.length) {
      setContributorReputation({});
      return;
    }
    setIsLoadingReputation(true);
    try {
      const deduped = Array.from(new Set(usernames)).slice(0, 25);
      const results = await Promise.allSettled(
        deduped.map(async (username) => ({
          username,
          response: await callAgent(`reputation for ${username}`),
        }))
      );
      const next: Record<string, ContributorReputation> = {};
      for (const result of results) {
        if (result.status !== "fulfilled") continue;
        next[result.value.username] = parseReputationResponse(result.value.response);
      }
      setContributorReputation(next);
    } finally {
      setIsLoadingReputation(false);
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
    setContributorReputation({});
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
      loadContributorStatuses(parsed.map((c) => c.githubUsername));
      loadContributorReputation(parsed.map((c) => c.githubUsername));
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
          ? "Repository analyzed. Review allocation, then create or refresh split."
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
      setContributorReputation({});
      trackUxEvent("splits_analyze_failed", { repo: normalizedRepo });
    }
  };

  const setAgentExperienceMode = async (mode: "guided" | "hands_off") => {
    setExperienceMode(mode);
    setIsSyncingExperienceMode(true);
    try {
      await callAgent(`experience ${mode === "hands_off" ? "hands-off" : "guided"}`);
      setMessage(`Agent experience mode set to ${mode === "hands_off" ? "hands-off" : "guided"}.`);
      setStatus("success");
      trackUxEvent("splits_experience_mode_changed", { mode });
    } catch (error) {
      setStatus("error");
      setMessage(`Failed to set experience mode: ${toUserFacingError(error)}`);
    } finally {
      setIsSyncingExperienceMode(false);
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
      if (paymentMode === "hold_all" && totalVerifiedCount !== totalContributors) {
        setStatus("error");
        setMessage("Hold mode requires every included contributor to be verified before payout.");
        return;
      }
      const proceed = window.confirm(
        `Confirm direct payout from your NEAR wallet:\n\nRepo: ${normalized}\nAmount: ${amount} NEAR\nSelected contributors: ${totalContributors}\nPayable now: ${totalVerifiedCount}/${totalContributors}\nMode: ${
          paymentMode === "verified_now" ? "Pay verified now" : "Hold until all verified"
        }\nSender wallet: ${nearAccountId}\n\n${
          paymentMode === "verified_now"
            ? "Only included + verified NEAR recipients will be paid in this run."
            : "Payout proceeds only when every included contributor is verified."
        }`
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
      setShowPaymentSuccessPulse(true);
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
  const parsedPayAmount = Number(payAmount);
  const hasValidPayAmount = Number.isFinite(parsedPayAmount) && parsedPayAmount > 0;
  const includedContributors = allocationCandidates.filter((c) => c.included);
  const includedVerifiedCount = includedContributors.filter((c: any) => c.payoutEligible).length;
  const includedVerifiedButBlockedCount = includedContributors.filter(
    (c) => c.verified && !c.payoutEligible && !c.isBot
  ).length;
  const includedUnverifiedCount = includedContributors.filter(
    (c) => !c.verified && !c.isBot
  ).length;
  const includedBotCount = includedContributors.filter((c) => c.isBot).length;
  const preflightChecks = useMemo(
    () => [
      { id: "repo", label: "Repository selected", ok: hasRepoInput },
      { id: "analyze", label: "Contributors analyzed", ok: hasAnalyzed },
      { id: "split", label: "Split created/refreshed", ok: hasSplitContext },
      { id: "wallet", label: "NEAR wallet connected", ok: isNearConnected && Boolean(nearAccountId) },
      { id: "amount", label: "Valid amount", ok: hasValidPayAmount },
      { id: "token", label: "Token supported (NEAR)", ok: payToken.toUpperCase() === "NEAR" },
      { id: "eligible", label: "At least one payable recipient", ok: livePayoutPreview.length > 0 },
      {
        id: "mode",
        label: paymentMode === "hold_all" ? "Hold mode: all included verified" : "Mode: pay verified now",
        ok: paymentMode === "verified_now" || (includedContributors.length > 0 && includedVerifiedCount === includedContributors.length),
      },
    ],
    [
      hasAnalyzed,
      hasRepoInput,
      hasSplitContext,
      hasValidPayAmount,
      includedContributors.length,
      includedVerifiedCount,
      isNearConnected,
      livePayoutPreview.length,
      nearAccountId,
      payToken,
      paymentMode,
    ]
  );
  const preflightFailed = preflightChecks.filter((item) => !item.ok);
  const canPayFromWalletNow = preflightFailed.length === 0;
  const payDisabledReason = preflightFailed[0]?.label ?? "";
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
        hint: `Payment blocked: ${payDisabledReason || "Complete preflight checks."}`,
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
    payDisabledReason,
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

            <div className="rounded-md border bg-card p-3">
              <p className="text-sm font-medium">Agent Experience</p>
              <p className="text-xs text-muted-foreground mb-2">
                Choose guided controls or a hands-off mode where intent is interpreted and outcomes are suggested automatically.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={experienceMode === "guided" ? "default" : "outline"}
                  onClick={() => setAgentExperienceMode("guided")}
                  disabled={isSyncingExperienceMode}
                >
                  Guided
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={experienceMode === "hands_off" ? "default" : "outline"}
                  onClick={() => setAgentExperienceMode("hands_off")}
                  disabled={isSyncingExperienceMode}
                >
                  Hands-off
                </Button>
                {isSyncingExperienceMode && <span className="text-xs text-muted-foreground">Syncing…</span>}
              </div>
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
              </div>
              <div id={paySectionId} className="rounded-md border bg-card p-3 md:sticky md:top-20">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">Step 3: Fund & Pay (on this page)</p>
                  <p className="text-xs text-muted-foreground">No chat redirect needed</p>
                </div>
                <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="rounded-full border border-green-300 bg-green-50 px-2 py-0.5 font-semibold text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-300">
                    Engine: Direct Wallet (NEAR)
                  </span>
                  <span className="rounded-full border border-blue-300 bg-blue-50 px-2 py-0.5 font-semibold text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300">
                    Agent Rails (HOT/Ping): optional backend mode
                  </span>
                </div>
                <div className="mb-3 rounded border bg-muted/40 p-2">
                  <p className="text-xs font-medium">Preflight checklist</p>
                  <div className="mt-2 grid gap-1 md:grid-cols-2">
                    {preflightChecks.map((check) => (
                      <p key={check.id} className={`text-xs ${check.ok ? "text-green-700 dark:text-green-400" : "text-amber-700 dark:text-amber-400"}`}>
                        {check.ok ? "✓" : "•"} {check.label}
                      </p>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="h-9 w-24 text-sm"
                    placeholder="1"
                  />
                  <Input
                    value={payToken}
                    onChange={(e) => setPayToken(e.target.value.toUpperCase())}
                    className="h-9 w-24 text-sm"
                    placeholder="NEAR"
                  />
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
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={payNow}
                    disabled={status === "loading" || !canPayFromWalletNow}
                  >
                    Pay from Wallet
                  </Button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={paymentMode === "verified_now" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPaymentMode("verified_now")}
                  >
                    Pay verified now
                  </Button>
                  <Button
                    type="button"
                    variant={paymentMode === "hold_all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPaymentMode("hold_all")}
                  >
                    Hold until all verified
                  </Button>
                </div>
                <div className="mt-3 rounded border bg-muted/40 p-2 text-xs">
                  <p>
                    You pay: {hasValidPayAmount ? parsedPayAmount.toFixed(4) : "0.0000"} {payToken.toUpperCase()}
                  </p>
                  <p>Will receive now: {livePayoutPreview.length}</p>
                  <p>Included contributors: {includedContributors.length}</p>
                  <p>Waiting for verification: {includedUnverifiedCount}</p>
                  <p>Blocked (wallet/reputation/rules): {includedVerifiedButBlockedCount}</p>
                  {includedBotCount > 0 && <p>Bot/system contributors: {includedBotCount}</p>}
                </div>
                <div className="mt-2 rounded border bg-muted/40 p-2 text-xs">
                  {paymentMode === "verified_now"
                    ? "Policy: Pay only included + verified recipients now. Unverified contributors are not charged and remain unpaid until they verify."
                    : "Policy: Hold payout until all included contributors are verified."}
                </div>
                {!canPayFromWalletNow && payDisabledReason && (
                  <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
                    Payment blocked: {payDisabledReason}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                type="button"
                className="text-xs w-fit"
                onClick={() => setShowMoreOptions((prev) => !prev)}
              >
                {showMoreOptions ? (
                  <>
                    Hide secondary options <ChevronUp className="ml-1 h-3.5 w-3.5" />
                  </>
                ) : (
                  <>
                    More options <ChevronDown className="ml-1 h-3.5 w-3.5" />
                  </>
                )}
              </Button>
              {showMoreOptions && (
                <div className="flex flex-wrap gap-2 rounded-md border bg-muted/30 p-2">
                  <Button variant="outline" onClick={repairSplit} disabled={status === "loading" || !hasRepoInput}>
                    Repair Split
                  </Button>
                  <Button variant="outline" onClick={checkPendingClaims} disabled={status === "loading" || !hasRepoInput}>
                    Check Pending
                  </Button>
                  <Link href="/agent">
                    <Button variant="outline" type="button">Open Agent (optional)</Button>
                  </Link>
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

            {status === "loading" && (
              <div className="rounded-md border bg-card p-3 space-y-2">
                <p className="text-sm font-medium">Working on it…</p>
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            )}

            {isLoadingStatuses && contributors.length > 0 && (
              <p className="text-xs text-muted-foreground">Refreshing contributor verification status…</p>
            )}
            {isLoadingReputation && contributors.length > 0 && (
              <p className="text-xs text-muted-foreground">Refreshing contributor reputation and agent eligibility…</p>
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
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Contributors are payout-eligible. Continue directly in Step 3 on this page.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={focusPayStep}
                      >
                        Go to Fund & Pay
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setShowAllocation(true)}
                      >
                        Review Allocation
                      </Button>
                    </div>
                  </div>
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

            {contributors.length > 0 && (
              <div className="rounded-md border bg-card p-4 space-y-2 text-sm">
                <p className="font-medium">Recipient Outcome (Before You Sign)</p>
                <p className="text-xs text-muted-foreground">
                  This is exactly what will happen if you click <strong>Pay from Wallet</strong> now.
                </p>
                <div className="grid gap-1 text-xs md:grid-cols-2">
                  <p className="text-green-700 dark:text-green-400">✓ Paid now: {livePayoutPreview.length}</p>
                  <p className="text-amber-700 dark:text-amber-400">• Awaiting verification: {includedUnverifiedCount}</p>
                  <p className="text-amber-700 dark:text-amber-400">• Blocked by payout rules: {includedVerifiedButBlockedCount}</p>
                  <p className="text-muted-foreground">• Excluded by you: {Math.max(contributors.length - includedContributors.length, 0)}</p>
                </div>
                {includedUnverifiedCount > 0 && (
                  <div className="pt-1">
                    <Link href={verificationLink}>
                      <Button size="sm" type="button" variant="outline">Invite Unverified Contributors</Button>
                    </Link>
                  </div>
                )}
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
                                {contributorReputation[contributor.githubUsername] && (
                                  <div className="mt-1 space-y-1">
                                    <p className="text-xs text-muted-foreground">
                                      Reputation: {contributorReputation[contributor.githubUsername].score ?? "n/a"} ({contributorReputation[contributor.githubUsername].tier})
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      Kind: {contributorReputation[contributor.githubUsername].kind}
                                      {contributorReputation[contributor.githubUsername].erc8004Registered ? " • ERC-8004" : ""}
                                    </p>
                                    <p className="text-xs">
                                      {(allocationCandidates.find((c) => c.githubUsername === contributor.githubUsername)?.payoutEligible ?? false)
                                        ? "Eligible now"
                                        : "Not eligible now"}
                                    </p>
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                {isBot ? (
                                  <span className="text-xs text-muted-foreground">N/A</span>
                                ) : (
                                  <div className="flex flex-wrap gap-2">
                                    <Link href={verifyHref} className="underline text-blue-700 dark:text-blue-400">
                                      Verify
                                    </Link>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-xs"
                                      onClick={() => copyText("Invite link", getVerificationInviteUrl(contributor.githubUsername))}
                                    >
                                      Invite
                                    </Button>
                                  </div>
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
                          {contributorReputation[contributor.githubUsername] && (
                            <p className="text-xs text-muted-foreground">
                              Reputation: {contributorReputation[contributor.githubUsername].score ?? "n/a"} ({contributorReputation[contributor.githubUsername].tier}) • Kind: {contributorReputation[contributor.githubUsername].kind}
                              {contributorReputation[contributor.githubUsername].erc8004Registered ? " • ERC-8004" : ""}
                              {" • "}
                              {(allocationCandidates.find((c) => c.githubUsername === contributor.githubUsername)?.payoutEligible ?? false)
                                ? "Eligible now"
                                : "Not eligible now"}
                            </p>
                          )}
                          {!isBot && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Link href={verifyHref} className="text-sm text-blue-700 dark:text-blue-400 underline">
                                Verify contributor
                              </Link>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => copyText("Invite link", getVerificationInviteUrl(contributor.githubUsername))}
                              >
                                Copy invite
                              </Button>
                            </div>
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
                    No included + eligible + verified NEAR recipients yet. Adjust inclusion, verification, or contributor reputation.
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
                <p className="font-medium">Payment Simulation (Per Contributor)</p>
                <p className="text-xs text-muted-foreground">
                  Preview before signature. This does not move funds yet.
                </p>
                <div className="space-y-2">
                  {paymentSimulationRows.map((row) => (
                    <div
                      key={row.githubUsername}
                      className="rounded border bg-muted/40 p-2 text-xs md:grid md:grid-cols-12 md:items-center md:gap-2"
                    >
                      <p className="font-medium md:col-span-3">@{row.githubUsername}</p>
                      <p className="text-muted-foreground md:col-span-2">{row.share.toFixed(2)}%</p>
                      <p className="md:col-span-3">
                        {row.outcome === "pay_now" ? (
                          <span className="text-green-700 dark:text-green-400">Paid now</span>
                        ) : row.outcome === "awaiting_verification" ? (
                          <span className="text-amber-700 dark:text-amber-400">Awaiting verification</span>
                        ) : row.outcome === "blocked_rule" ? (
                          <span className="text-amber-700 dark:text-amber-400">Blocked by rules</span>
                        ) : (
                          <span className="text-muted-foreground">Excluded</span>
                        )}
                      </p>
                      <p className="font-mono md:col-span-2">{row.draftAmount.toFixed(4)} NEAR</p>
                      <p className="text-muted-foreground md:col-span-2">
                        {row.outcome === "pay_now" ? row.walletAddress || "wallet set" : row.blockedReason}
                      </p>
                    </div>
                  ))}
                </div>
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
              <div className={`rounded-md border bg-card p-4 text-sm space-y-2 ${showPaymentSuccessPulse ? "ring-2 ring-green-300 dark:ring-green-700" : ""}`}>
                <p className="font-medium">Payout Receipt</p>
                <p>Distributed: {payReceipt.distributedAmount || "n/a"}</p>
                <p>
                  Engine:{" "}
                  {payReceipt.engine === "direct_wallet_near" ? "Direct Wallet (NEAR)" : payReceipt.engine || "Direct Wallet (NEAR)"}
                </p>
                <p>
                  Coverage:{" "}
                  {payReceipt.verifiedCount !== undefined && payReceipt.totalCount !== undefined
                    ? `${payReceipt.verifiedCount}/${payReceipt.totalCount}`
                    : "n/a"}
                </p>
                <p>Protocol: {payReceipt.protocol || "n/a"}</p>
                <p>
                  Transaction:{" "}
                  {payReceipt.transactionRef && payReceipt.transactionRef !== "n/a" ? (
                    <a
                      className="underline text-blue-700 dark:text-blue-400 break-all"
                      href={`https://nearblocks.io/txns/${payReceipt.transactionRef}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {payReceipt.transactionRef}
                    </a>
                  ) : (
                    "n/a"
                  )}
                </p>
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
                <div className="rounded border bg-muted/40 p-2 space-y-1 text-xs">
                  <p className="font-medium">Execution Timeline</p>
                  <p className="text-green-700 dark:text-green-400">✓ Payout plan prepared</p>
                  <p className="text-green-700 dark:text-green-400">
                    ✓ Wallet signatures collected ({paymentTxs.length} transaction{paymentTxs.length === 1 ? "" : "s"})
                  </p>
                  <p className="text-green-700 dark:text-green-400">✓ Transactions submitted on-chain</p>
                  <p className={payReceipt.pendingCount && payReceipt.pendingCount > 0 ? "text-amber-700 dark:text-amber-400" : "text-green-700 dark:text-green-400"}>
                    {payReceipt.pendingCount && payReceipt.pendingCount > 0
                      ? `• ${payReceipt.pendingCount} pending claim(s) remain until verification`
                      : "✓ No pending claims in this run"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={checkPendingClaims}>
                    View Pending Claims
                  </Button>
                  {payReceipt.transactionRef && payReceipt.transactionRef !== "n/a" && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => copyText("Transaction hash", payReceipt.transactionRef || "")}
                    >
                      Copy Transaction Hash
                    </Button>
                  )}
                  {repoPath && (
                    <Link href={`/agent?command=${encodeURIComponent(`pending github.com/${repoPath}`)}`}>
                      <Button type="button" variant="outline" size="sm">Open Claim View</Button>
                    </Link>
                  )}
                </div>
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
          <div className="max-w-4xl mx-auto flex gap-2 items-center">
            <Button
              type="button"
              className="flex-1"
              onClick={nextAction.onClick}
              disabled={status === "loading" || nextAction.disabled}
            >
              {nextAction.label}
            </Button>
          </div>
          {nextAction.disabled && payDisabledReason && (
            <p className="max-w-4xl mx-auto mt-2 text-[11px] text-amber-700 dark:text-amber-400">
              Payment blocked: {payDisabledReason}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
