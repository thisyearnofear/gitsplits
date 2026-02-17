"use client";

import { useMemo, useState } from "react";
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
import { AlertCircle, CheckCircle2, GitBranch } from "lucide-react";

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
      setTimeout(() => setCopiedState(""), 1800);
    } catch {
      setCopiedState("Copy failed");
    }
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
      throw new Error(data.error || "Agent request failed.");
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
    setStatus("loading");
    setMessage("");
    setAnalyzeResponse("");
    setCreateResponse("");
    setContributors([]);
    setVerificationHint("");

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
      }
      setStatus("success");
      setMessage(
        parsed.length > 0
          ? "Repository analyzed successfully. You can create a split now."
          : "Analysis completed. Contributor table could not be fully parsed, but you can still create a split."
      );
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Failed to analyze repository.");
    }
  };

  const createSplit = async () => {
    if (!repoInput.trim()) {
      setStatus("error");
      setMessage("Repository URL is required.");
      return;
    }

    const normalizedRepo = normalizeRepoUrl(repoInput);
    setStatus("loading");
    setMessage("Creating split via agent...");
    setCreateResponse("");

    try {
      const response = await callAgent(`create ${normalizedRepo}`);
      setCreateResponse(response);
      setStatus("success");
      setMessage("Split creation flow completed.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Failed to create split.");
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

            <div className="flex gap-2">
              <Button onClick={analyzeRepo} disabled={status === "loading"}>
                {status === "loading" ? "Processing..." : "Analyze Contributions"}
              </Button>
              <Button variant="outline" onClick={createSplit} disabled={status === "loading"}>
                Create Split
              </Button>
              {repoInput.trim() && (
                <Link
                  href={`/agent?command=${encodeURIComponent(`pay 10 USDC to ${normalizeRepoUrl(repoInput)}`)}`}
                >
                  <Button variant="secondary" type="button">Pay Now</Button>
                </Link>
              )}
            </div>

            {verificationHint && (
              <p className="text-sm text-blue-700">{verificationHint}. Invite contributors at /verify.</p>
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
                <p className="p-4 text-sm text-gray-600">No contributors parsed yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>GitHub User</TableHead>
                      <TableHead>Share (%)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contributors.map((contributor) => (
                      <TableRow key={contributor.githubUsername}>
                        <TableCell>{contributor.githubUsername}</TableCell>
                        <TableCell>{contributor.percentage.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
