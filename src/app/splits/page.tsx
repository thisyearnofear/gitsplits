"use client";

import { useMemo, useState } from "react";
import { useNearWallet } from "@/hooks/useNearWallet";
import WalletStatusBar from "@/components/shared/WalletStatusBar";
import { NearContractService } from "@/services/nearContractService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, CheckCircle2, GitBranch } from "lucide-react";

type Contributor = {
  githubUsername: string;
  percentage: number;
};

export default function SplitsPage() {
  const { selector, isConnected: isNearConnected, accountId: nearAccountId } = useNearWallet();
  const [repoUrl, setRepoUrl] = useState("");
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [createdSplitId, setCreatedSplitId] = useState("");

  const contractService = useMemo(() => new NearContractService(selector, nearAccountId), [selector, nearAccountId]);

  const analyzeRepo = async () => {
    if (!repoUrl.trim()) {
      setStatus("error");
      setMessage("Repository URL is required.");
      return;
    }

    setStatus("loading");
    setMessage("");
    setCreatedSplitId("");

    try {
      const response = await fetch("/api/github/analyze-contributions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl: repoUrl.trim() }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || data.error || "Failed to analyze repository.");
      }

      setContributors(data.contributors || []);
      setStatus("success");
      setMessage("Repository analyzed. You can now create a split on NEAR.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Failed to analyze repository.");
      setContributors([]);
    }
  };

  const createSplit = async () => {
    if (!isNearConnected || !nearAccountId) {
      setStatus("error");
      setMessage("Connect a NEAR wallet before creating a split.");
      return;
    }
    if (!repoUrl.trim() || contributors.length === 0) {
      setStatus("error");
      setMessage("Analyze a repository first.");
      return;
    }

    setStatus("loading");
    setMessage("Creating split on NEAR...");
    try {
      const splitId = await contractService.createSplit(repoUrl.trim(), nearAccountId);
      setCreatedSplitId(splitId);
      setStatus("success");
      setMessage("Split creation transaction submitted on NEAR.");
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
              Analyze a GitHub repo and create a contributor split backed by your connected NEAR wallet.
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
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/owner/repo"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={analyzeRepo} disabled={status === "loading"}>
                {status === "loading" ? "Processing..." : "Analyze Contributions"}
              </Button>
              <Button
                variant="outline"
                onClick={createSplit}
                disabled={status === "loading" || contributors.length === 0 || !isNearConnected}
              >
                Create Split on NEAR
              </Button>
            </div>

            {createdSplitId && (
              <div className="rounded-md border bg-white p-3 text-sm">
                Created split ID: <span className="font-mono">{createdSplitId}</span>
              </div>
            )}

            <div className="rounded-md border bg-white">
              <div className="flex items-center gap-2 border-b p-3 font-medium">
                <GitBranch className="h-4 w-4" />
                Contributor Allocation
              </div>
              {contributors.length === 0 ? (
                <p className="p-4 text-sm text-gray-600">No contributors loaded yet.</p>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
