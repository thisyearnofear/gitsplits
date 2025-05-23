import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Shield,
  AlertCircle,
  Check,
  Code,
  RefreshCw,
  ExternalLink,
  Github,
  Wallet,
  LogOut,
} from "lucide-react";
import { useNearWallet } from "@/hooks/useNearWallet";
import {
  NearContractService,
  Split,
  Attestation,
} from "@/services/nearContractService";

const NearContractManager: React.FC = () => {
  const {
    isConnected,
    accountId,
    isLoading: walletLoading,
    error: walletError,
    connect,
    disconnect,
    selector,
  } = useNearWallet();

  const [isWorker, setIsWorker] = useState(false);
  const [repoUrl, setRepoUrl] = useState("");
  const [splits, setSplits] = useState<Split[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [contractService, setContractService] =
    useState<NearContractService | null>(null);

  useEffect(() => {
    if (selector && accountId) {
      const service = new NearContractService(selector, accountId);
      setContractService(service);
    }
  }, [selector, accountId, isConnected]);

  useEffect(() => {
    const checkWorkerStatus = async () => {
      if (isConnected && accountId && contractService) {
        try {
          const workerStatus = await contractService.isWorkerRegistered(
            accountId
          );
          setIsWorker(workerStatus);

          if (workerStatus) {
            await loadSplits();
          }
        } catch (err) {
          console.error("Error checking worker status:", err);
        }
      }
    };

    if (isConnected && accountId) {
      checkWorkerStatus();
    }
  }, [isConnected, accountId, contractService]);

  const loadSplits = async () => {
    if (!contractService || !accountId) return;

    try {
      setLoading(true);

      // In a real implementation, you would fetch the user's splits from the contract
      // For now, we'll use placeholder data
      setSplits([
        {
          id: "split-123",
          repo_url: "github.com/near/near-sdk-rs",
          owner: accountId,
          contributors: [
            {
              github_username: "user1",
              percentage: "7000000000000000000000000",
            },
            {
              github_username: "user2",
              percentage: "3000000000000000000000000",
            },
          ],
          created_at: Date.now() * 1000000,
          updated_at: Date.now() * 1000000,
        },
      ]);
    } catch (err) {
      console.error("Error loading splits:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    try {
      await connect();

      // Add a small delay to allow the connection state to update
      setTimeout(() => {
        // If we're still not connected after the modal closes, we might need to refresh
        if (!isConnected && !accountId) {
          setError(
            "Connection not detected. You may need to refresh the page."
          );
        }
      }, 2000);
    } catch (err) {
      setError("Failed to sign in with NEAR wallet");
    }
  };

  const handleSignOut = async () => {
    try {
      await disconnect();
      setIsWorker(false);
      setSplits([]);
    } catch (err) {
      console.error("Error signing out:", err);
      setError("Failed to sign out from NEAR wallet");
    }
  };

  const handleRegisterWorker = async () => {
    if (!contractService) return;

    try {
      setLoading(true);
      setError("");

      // Simple attestation for demo purposes
      const attestation: Attestation = {
        quote: "test-quote",
        endorsements: "test-endorsements",
      };

      const result = await contractService.registerWorker(
        attestation,
        "test-code-hash"
      );

      if (result) {
        setIsWorker(true);
      } else {
        setError("Failed to register as a worker");
      }
    } catch (err: any) {
      console.error("Error registering worker:", err);
      setError(`Failed to register worker: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSplit = async () => {
    if (!contractService || !accountId) return;

    if (!repoUrl) {
      setError("Please enter a repository URL");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const splitId = await contractService.createSplit(repoUrl, accountId);

      if (splitId) {
        await loadSplits();
        setRepoUrl("");
      } else {
        setError("Failed to create split");
      }
    } catch (err: any) {
      console.error("Error creating split:", err);
      setError(`Failed to create split: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Contract Status Card */}
      <Card
        className={`border-l-4 ${
          isConnected ? "border-l-green-500" : "border-l-amber-500"
        }`}
      >
        <CardContent className="flex items-center p-4">
          <div
            className={`mr-4 p-2 rounded-full ${
              isConnected ? "bg-green-100" : "bg-amber-100"
            }`}
          >
            {isConnected ? (
              <Wallet className="h-6 w-6 text-green-500" />
            ) : (
              <AlertCircle className="h-6 w-6 text-amber-500" />
            )}
          </div>
          <div>
            <h3 className="font-medium">
              {isConnected
                ? "NEAR Wallet Connected"
                : "NEAR Wallet Not Connected"}
            </h3>
            <p className="text-sm text-gray-600">
              {isConnected
                ? `Connected as: ${accountId}`
                : "Please connect your NEAR wallet to manage your splits"}
            </p>
          </div>
          {!isConnected && (
            <Button
              className="ml-auto flex items-center gap-2"
              onClick={handleSignIn}
              disabled={walletLoading}
            >
              {walletLoading ? (
                <>
                  <span className="animate-spin">⟳</span>
                  Connecting...
                </>
              ) : (
                <>
                  <div className="w-4 h-4 rounded-full bg-black flex items-center justify-center">
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 32 32"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M21.2105 9.15789L18.1053 14.0211L17.6842 14.7368L13.8947 21.0526L10.7895 15.7895H8L13.8947 26.5263L21.2105 14.0211V22.1053H24V9.15789H21.2105Z"
                        fill="white"
                      />
                    </svg>
                  </div>
                  Connect NEAR Wallet
                </>
              )}
            </Button>
          )}
          {isConnected && !isWorker && (
            <div className="ml-auto flex gap-2">
              <Button onClick={handleRegisterWorker} disabled={loading}>
                {loading ? "Registering..." : "Register as Worker"}
              </Button>
              <Button variant="outline" size="icon" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
          {isConnected && isWorker && (
            <div className="ml-auto flex items-center gap-4">
              <div className="flex items-center text-green-600">
                <Check className="mr-1 h-5 w-5" /> Registered Worker
              </div>
              <Button variant="outline" size="icon" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {isConnected && isWorker && (
        <>
          {/* Create Split Card */}
          <Card>
            <CardHeader>
              <CardTitle>Create New Split</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Input
                  placeholder="Enter GitHub repository URL"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  className="flex-grow"
                />
                <Button
                  onClick={handleCreateSplit}
                  disabled={loading || !repoUrl}
                >
                  {loading ? "Creating..." : "Create Split"}
                </Button>
              </div>
              {error && (
                <div className="mt-2 text-red-500 text-sm">{error}</div>
              )}
            </CardContent>
          </Card>

          {/* Splits Table Card */}
          <Card>
            <CardHeader>
              <CardTitle>Your Contract Splits</CardTitle>
            </CardHeader>
            <CardContent>
              {splits.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Repository</TableHead>
                      <TableHead>Split ID</TableHead>
                      <TableHead>Contributors</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {splits.map((split) => (
                      <TableRow key={split.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center">
                            <Github className="mr-2 h-4 w-4" />
                            {split.repo_url}
                          </div>
                        </TableCell>
                        <TableCell>{split.id}</TableCell>
                        <TableCell>{split.contributors.length}</TableCell>
                        <TableCell>
                          {new Date(
                            split.created_at / 1000000
                          ).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline">
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <Code className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    No Contract Splits Yet
                  </h3>
                  <p className="text-gray-500 mb-4">
                    You haven't created any splits through the NEAR contract
                    yet.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Contract Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>About NEAR Contract Integration</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            The GitSplits NEAR contract provides secure, on-chain management of
            repository splits and distributions. It runs in a Trusted Execution
            Environment (TEE) for maximum security.
          </p>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-gray-50 p-4 rounded">
              <h4 className="font-medium mb-2">Contract ID</h4>
              <code className="text-sm">gitsplits-test.testnet</code>
            </div>
            <div className="bg-gray-50 p-4 rounded">
              <h4 className="font-medium mb-2">Network</h4>
              <span>NEAR Testnet</span>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                window.open(
                  "https://testnet.nearblocks.io/address/gitsplits-test.testnet",
                  "_blank"
                )
              }
            >
              View on Explorer <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NearContractManager;
