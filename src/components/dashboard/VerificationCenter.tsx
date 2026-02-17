import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Shield,
  Github,
  Twitter,
  GitBranch,
  RefreshCw,
  Copy,
  ExternalLink,
  Check,
  Wallet,
} from "lucide-react";
import { signIn, useSession } from "next-auth/react";
import { useAppKitAccount } from "@reown/appkit/react";
import { useNearWallet } from "@/hooks/useNearWallet";
import { useSignMessage } from "wagmi";

interface VerificationCenterProps {
  isGitHubConnected: boolean;
  setIsGitHubConnected: (connected: boolean) => void;
  walletAddress?: string;
}

const VerificationCenter: React.FC<VerificationCenterProps> = ({
  isGitHubConnected,
  setIsGitHubConnected,
  walletAddress,
}) => {
  const cleanWalletAddress = (value?: string | null) =>
    value && value !== "Unknown NEAR Account" ? value : "";
  const [verificationLevel, setVerificationLevel] = useState(1); // Basic level by default
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [githubUsername, setGithubUsername] = useState("");
  const [twitterHandle, setTwitterHandle] = useState("");
  const [githubSignature, setGithubSignature] = useState("");
  const [twitterSignature, setTwitterSignature] = useState("");
  const [githubGistId, setGithubGistId] = useState("");
  const [verificationStep, setVerificationStep] = useState<
    "input" | "signature" | "verify"
  >("input");
  const [copiedGithub, setCopiedGithub] = useState(false);
  const [copiedTwitter, setCopiedTwitter] = useState(false);
  const [isTwitterVerified, setIsTwitterVerified] = useState(false);
  const [isGithubVerified, setIsGithubVerified] = useState(false);
  const [pendingDistributions, setPendingDistributions] = useState<any[]>([]);
  const [tweetUrl, setTweetUrl] = useState("");
  const { isConnected: isEvmConnected, address: evmAddress } =
    useAppKitAccount();
  const {
    isConnected: isNearConnected,
    accountId: nearAccountId,
    connect: connectNear,
    disconnect: disconnectNear,
    selector,
  } = useNearWallet();
  const [isEvmVerified, setIsEvmVerified] = useState(false);
  const [isNearVerified, setIsNearVerified] = useState(false);
  const [evmSig, setEvmSig] = useState("");
  const [nearSig, setNearSig] = useState("");
  const { signMessageAsync } = useSignMessage();
  const resolvedWalletAddress =
    cleanWalletAddress(walletAddress) ||
    cleanWalletAddress(nearAccountId) ||
    cleanWalletAddress(evmAddress) ||
    "";

  const { data: session } = useSession();

  // Determine Twitter verification from next-auth session
  const twitterSessionHandle =
    session?.user?.name || session?.user?.email || "";
  const isTwitterSessionVerified =
    !!twitterSessionHandle &&
    !!session?.user?.image &&
    session.user.image.includes("twimg.com");

  // Load verification status and pending distributions
  useEffect(() => {
    if (resolvedWalletAddress) {
      fetchVerificationStatus();
    }
  }, [resolvedWalletAddress]);

  // Fetch verification status
  const fetchVerificationStatus = async () => {
    try {
      setIsLoading(true);
      setStatusMessage("Checking verification status...");

      // Call API to get verification status
      const response = await fetch(
        `/api/verification-status?wallet=${resolvedWalletAddress}`
      );
      const data = await response.json();

      if (data.success) {
        if (data.githubVerified) {
          setIsGithubVerified(true);
          const username = data.githubUsername || "";
          setGithubUsername(username);
          if (username) {
            fetchPendingDistributions(username);
          }
        }

        if (data.twitterVerified) {
          setIsTwitterVerified(true);
          setTwitterHandle(data.twitterHandle || "");
        }

        if (data.evmVerified) {
          setIsEvmVerified(true);
        }

        if (data.nearVerified) {
          setIsNearVerified(true);
        }

        // Update verification level
        if (data.githubVerified && data.twitterVerified) {
          setVerificationLevel(3);
          setIsGitHubConnected(true);
        } else if (data.githubVerified || data.twitterVerified) {
          setVerificationLevel(2);
          setIsGitHubConnected(data.githubVerified);
        }
      }

      setIsLoading(false);
      setStatusMessage(null);
    } catch (error) {
      const err = error as Error;
      console.error("Error fetching verification status:", err);
      setIsLoading(false);
      setStatusMessage("Error checking verification status. Please try again.");
    }
  };

  // Fetch pending distributions
  const fetchPendingDistributions = async (usernameArg?: string) => {
    try {
      const username = usernameArg || githubUsername;
      if (!username) return;

      const response = await fetch(
        `/api/pending-distributions?github=${username}`
      );
      const data = await response.json();

      if (data.success) {
        setPendingDistributions(data.distributions || []);
      }
    } catch (error) {
      const err = error as Error;
      console.error("Error fetching pending distributions:", err);
    }
  };

  // Generate verification codes for GitHub and Twitter
  const generateSignatures = async () => {
    if (!resolvedWalletAddress) {
      setStatusMessage("Please connect an EVM or NEAR wallet first.");
      return;
    }

    try {
      setIsLoading(true);
      setStatusMessage("Generating verification codes...");

      // Call our API to generate verification codes
      const response = await fetch("/api/generate-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletAddress: resolvedWalletAddress,
          githubUsername: githubUsername || undefined,
          twitterHandle: twitterHandle || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        if (data.githubVerificationCode) {
          setGithubSignature(data.githubVerificationCode);
        }

        if (data.twitterVerificationCode) {
          setTwitterSignature(data.twitterVerificationCode);
        }

        setVerificationStep("signature");
        setIsLoading(false);
        setStatusMessage(
          "Verification codes generated. Please follow the next steps to verify your identities."
        );
      } else {
        throw new Error(data.error || "Failed to generate verification codes");
      }
    } catch (error) {
      const err = error as Error;
      console.error("Error generating verification codes:", err);
      setIsLoading(false);
      setStatusMessage(`Error: ${err.message}`);
    }
  };

  // Copy signature to clipboard
  const copyToClipboard = (text: string, type: "github" | "twitter") => {
    navigator.clipboard.writeText(text);
    if (type === "github") {
      setCopiedGithub(true);
      setTimeout(() => setCopiedGithub(false), 2000);
    } else {
      setCopiedTwitter(true);
      setTimeout(() => setCopiedTwitter(false), 2000);
    }
  };

  // Open Twitter to post verification
  const postToTwitter = () => {
    if (!twitterSignature) return;

    const text = `Verifying my X identity for GitSplits: ${twitterSignature}`;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
      "_blank"
    );
  };

  // EVM SIWE verification
  const handleEvmVerify = async () => {
    if (!isEvmConnected || !evmAddress || !signMessageAsync) return;
    try {
      setIsLoading(true);
      setStatusMessage("Signing EVM message...");
      const message = `Sign this message to verify your EVM address for GitSplits: ${evmAddress}`;
      const signature = await signMessageAsync({ message });
      setEvmSig(signature as string);
      setStatusMessage("Verifying EVM signature...");
      // Immediately call backend to verify
      const response = await fetch("/api/verify-identities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: resolvedWalletAddress,
          evmSignature: signature,
          evmMessage: message,
          evmAddress,
        }),
      });
      const data = await response.json();
      if (data.success && typeof data.evmVerified === "boolean") {
        setIsEvmVerified(data.evmVerified);
        setStatusMessage(
          data.evmVerified ? "EVM wallet verified!" : "EVM verification failed."
        );
      } else {
        setStatusMessage(
          `EVM verification failed: ${data.error || "Unknown error"}`
        );
      }
      setIsLoading(false);
    } catch (err) {
      setIsLoading(false);
      setStatusMessage("EVM verification failed");
    }
  };

  // NEAR signature verification
  const handleNearVerify = async () => {
    if (!isNearConnected || !nearAccountId || !selector) return;
    try {
      const message = `Sign this message to verify your NEAR address for GitSplits: ${nearAccountId}`;
      const wallet = await selector.wallet();
      // Prepare params for signMessage
      const params: any = { message };
      // Add required fields if needed (fallbacks)
      if (wallet.signMessage.length > 0) {
        params.recipient = nearAccountId;
        params.nonce = Date.now().toString();
      }
      const signed: any = await wallet.signMessage(params);
      // Defensive: check for signature property
      const signature = signed && signed.signature ? signed.signature : signed;
      if (!signature) throw new Error("No signature returned");
      setNearSig(signature);
      setStatusMessage(
        'NEAR signature generated. Please click "Verify Identities" to complete verification.'
      );
    } catch (err) {
      setStatusMessage(
        "Failed to sign NEAR message: " + (err as Error).message
      );
    }
  };

  // Verify GitHub, Twitter, EVM, and NEAR identities
  const verifyIdentities = async () => {
    try {
      setIsLoading(true);
      setStatusMessage("Verifying your identities...");

      const response = await fetch("/api/verify-identities", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletAddress: resolvedWalletAddress,
          githubUsername: githubUsername || undefined,
          twitterHandle: twitterHandle || undefined,
          githubGistId: githubGistId || undefined,
          tweetUrl: tweetUrl || undefined,
          evmSignature: evmSig || undefined,
          evmMessage: evmSig
            ? `Sign this message to verify your EVM address for GitSplits: ${evmAddress}`
            : undefined,
          evmAddress: evmSig ? evmAddress : undefined,
          nearSignature: nearSig || undefined,
          nearMessage: nearSig
            ? `Sign this message to verify your NEAR address for GitSplits: ${nearAccountId}`
            : undefined,
          nearAccountId: nearSig ? nearAccountId : undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        if (data.githubVerified) {
          setIsGithubVerified(true);
        }
        if (data.twitterVerified) {
          setIsTwitterVerified(true);
        }
        if (typeof data.evmVerified === "boolean") {
          setIsEvmVerified(data.evmVerified);
        }
        if (typeof data.nearVerified === "boolean") {
          setIsNearVerified(data.nearVerified);
        }
        setVerificationStep("input");
        setStatusMessage("Verification successful!");
        // Fetch pending distributions if verified
        if (data.githubVerified) {
          fetchPendingDistributions();
        }
      } else {
        setStatusMessage(`Verification failed: ${data.error}`);
      }
      setIsLoading(false);
    } catch (error) {
      const err = error as Error;
      console.error("Error verifying identities:", err);
      setIsLoading(false);
      setStatusMessage(`Error: ${err.message}`);
    }
  };

  // Claim pending distributions
  const claimDistributions = async () => {
    try {
      setIsLoading(true);
      setStatusMessage("Claiming pending distributions...");

      const response = await fetch("/api/claim-distributions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletAddress: resolvedWalletAddress,
          githubUsername,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setPendingDistributions([]);
        setStatusMessage("Distributions claimed successfully!");
      } else {
        setStatusMessage(`Failed to claim distributions: ${data.error}`);
      }

      setIsLoading(false);
    } catch (error) {
      const err = error as Error;
      console.error("Error claiming distributions:", err);
      setIsLoading(false);
      setStatusMessage(`Error: ${err.message}`);
    }
  };

  const handleRefresh = () => {
    fetchVerificationStatus();
    fetchPendingDistributions();
  };

  // Update verification level logic
  useEffect(() => {
    let level = 1;
    if (
      (isGithubVerified || isTwitterVerified) &&
      (isEvmVerified || isNearVerified)
    ) {
      level = 2;
    }
    if (
      isGithubVerified &&
      isTwitterVerified &&
      (isEvmVerified || isNearVerified)
    ) {
      level = 3;
    }
    if (
      isGithubVerified &&
      isTwitterVerified &&
      isEvmVerified &&
      isNearVerified
    ) {
      level = 4;
    }
    setVerificationLevel(level);
  }, [isGithubVerified, isTwitterVerified, isEvmVerified, isNearVerified]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Your Verification Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <div className="bg-blue-100 p-4 rounded-full">
              <Shield className="h-12 w-12 text-blue-600" />
            </div>

            <div className="flex-1">
              <h3 className="text-lg font-medium mb-2">
                Level {verificationLevel}:{" "}
                {verificationLevel === 1
                  ? "Basic"
                  : verificationLevel === 2
                  ? "Identity Verified"
                  : verificationLevel === 3
                  ? "Fully Verified"
                  : verificationLevel === 4
                  ? "GitSplitter"
                  : "None"}
              </h3>

              <p className="text-gray-600 mb-4">
                {verificationLevel === 1
                  ? "You have basic verification. Connect your EVM or NEAR wallet to continue."
                  : verificationLevel === 2
                  ? "One of your identities and one wallet is verified. Verify both GitHub and X/Twitter, and both wallets for the highest level."
                  : verificationLevel === 3
                  ? "You have both GitHub and X/Twitter verified, and at least one wallet. Verify both wallets for GitSplitter status."
                  : verificationLevel === 4
                  ? "You are a GitSplitter! All identities and wallets are verified."
                  : "You need to verify your account to use GitSplits."}
              </p>

              <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                <div
                  className="bg-blue-600 h-2.5 rounded-full"
                  style={{ width: `${verificationLevel * 25}%` }}
                ></div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="border rounded-md p-4">
                  <div className="flex items-center mb-2">
                    <Wallet className="mr-2 h-5 w-5" />
                    <h4 className="font-medium">EVM Wallet</h4>
                    {!!isEvmVerified && (
                      <Check className="ml-2 h-4 w-4 text-green-500" />
                    )}
                  </div>
                  {isEvmConnected ? (
                    <>
                      <p className="text-sm text-green-600 mb-2">
                        Connected as: {evmAddress}
                      </p>
                      {!isEvmVerified && (
                        <Button size="sm" onClick={handleEvmVerify}>
                          Verify EVM Address
                        </Button>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-gray-600 mb-2">Not connected</p>
                      <Button size="sm" variant="outline" disabled>
                        Connect from wallet menu
                      </Button>
                    </>
                  )}
                </div>
                <div className="border rounded-md p-4">
                  <div className="flex items-center mb-2">
                    <Wallet className="mr-2 h-5 w-5" />
                    <h4 className="font-medium">NEAR Wallet</h4>
                    {!!isNearVerified && (
                      <Check className="ml-2 h-4 w-4 text-green-500" />
                    )}
                  </div>
                  {isNearConnected ? (
                    <>
                      <p className="text-sm text-green-600 mb-2">
                        Connected as: {nearAccountId}
                      </p>
                      {!isNearVerified && (
                        <Button size="sm" onClick={handleNearVerify}>
                          Verify NEAR Address
                        </Button>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-gray-600 mb-2">Not connected</p>
                      <Button size="sm" variant="outline" onClick={connectNear}>
                        Connect NEAR Wallet
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <Button
                  variant="outline"
                  onClick={handleRefresh}
                  disabled={isLoading}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {isLoading && statusMessage?.includes("Refreshing")
                    ? "Refreshing..."
                    : "Check Verification Status"}
                </Button>
              </div>

              {/* Verification Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="border rounded-md p-4">
                  <div className="flex items-center mb-2">
                    <Github className="mr-2 h-5 w-5" />
                    <h4 className="font-medium">GitHub</h4>
                    {isGithubVerified && (
                      <Check className="ml-2 h-4 w-4 text-green-500" />
                    )}
                  </div>
                  {isGithubVerified ? (
                    <p className="text-sm text-green-600">
                      Verified as: {githubUsername}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-600">Not verified</p>
                  )}
                </div>

                <div className="border rounded-md p-4">
                  <div className="flex items-center mb-2">
                    <Twitter className="mr-2 h-5 w-5" />
                    <h4 className="font-medium">X/Twitter</h4>
                    {(isTwitterVerified || isTwitterSessionVerified) && (
                      <Check className="ml-2 h-4 w-4 text-green-500" />
                    )}
                  </div>
                  {isTwitterVerified || isTwitterSessionVerified ? (
                    <p className="text-sm text-green-600">
                      Verified as: @{twitterHandle || twitterSessionHandle}
                    </p>
                  ) : (
                    <>
                      <p className="text-sm text-gray-600 mb-2">Not verified</p>
                      <Button
                        variant="outline"
                        className="mt-2"
                        onClick={() => signIn("twitter")}
                      >
                        <Twitter className="mr-2 h-4 w-4" />
                        Sign in with Twitter
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Pending Distributions */}
              {pendingDistributions.length > 0 && (
                <div className="border rounded-md p-4 mb-4">
                  <h4 className="font-medium mb-2">Pending Distributions</h4>
                  <ul className="space-y-2 mb-3">
                    {pendingDistributions.map((dist, index) => (
                      <li key={index} className="text-sm">
                        {dist.amount} {dist.token}
                      </li>
                    ))}
                  </ul>
                  <Button onClick={claimDistributions} disabled={isLoading}>
                    {isLoading && statusMessage?.includes("Claiming")
                      ? "Claiming..."
                      : "Claim All"}
                  </Button>
                </div>
              )}

              {statusMessage && (
                <div className="mt-4 text-blue-700 text-sm">
                  {statusMessage}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Verification Form */}
      <Card>
        <CardHeader>
          <CardTitle>Verify Your Identities</CardTitle>
        </CardHeader>
        <CardContent>
          {verificationStep === "input" && (
            <div className="space-y-4">
              {!resolvedWalletAddress && (
                <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                  Connect an EVM or NEAR wallet before generating verification codes.
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="githubUsername">GitHub Username</Label>
                  <div className="flex items-center">
                    <Github className="mr-2 h-4 w-4" />
                    <Input
                      id="githubUsername"
                      value={githubUsername}
                      onChange={(e) => setGithubUsername(e.target.value)}
                      placeholder="Enter your GitHub username"
                      disabled={isGithubVerified}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="twitterHandle">X/Twitter Handle</Label>
                  <div className="flex items-center">
                    <Twitter className="mr-2 h-4 w-4" />
                    <Input
                      id="twitterHandle"
                      value={twitterHandle}
                      onChange={(e) => setTwitterHandle(e.target.value)}
                      placeholder="Enter your X/Twitter handle (without @)"
                      disabled={isTwitterVerified}
                    />
                  </div>
                </div>
              </div>

              <Button
                onClick={generateSignatures}
                disabled={
                  isLoading ||
                  !resolvedWalletAddress ||
                  (!githubUsername && !twitterHandle) ||
                  (isGithubVerified && isTwitterVerified)
                }
              >
                {isLoading
                  ? "Generating..."
                  : "Generate Verification Signatures"}
              </Button>
            </div>
          )}

          {verificationStep === "signature" && (
            <div className="space-y-6">
              {githubUsername && !isGithubVerified && (
                <div className="space-y-4">
                  <h3 className="font-medium">GitHub Verification</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="border rounded-md p-4">
                        <h4 className="font-medium mb-2">
                          Create a GitHub Gist
                        </h4>
                        <ol className="list-decimal list-inside space-y-3">
                          <li>
                            Create a{" "}
                            <a
                              href="https://gist.github.com/new"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline flex items-center"
                            >
                              new public GitHub Gist{" "}
                              <ExternalLink className="ml-1 h-3 w-3" />
                            </a>
                          </li>
                          <li>
                            <div>Copy this verification code to your Gist:</div>
                            <div className="bg-gray-100 p-3 rounded mt-1 relative">
                              <pre className="text-sm overflow-x-auto">
                                {githubSignature}
                              </pre>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="absolute top-2 right-2"
                                onClick={() =>
                                  copyToClipboard(githubSignature, "github")
                                }
                              >
                                {copiedGithub === true ? (
                                  <Check className="h-4 w-4" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </li>
                          <li>
                            <div>
                              Enter the Gist ID (last part of the Gist URL):
                            </div>
                            <div className="flex items-center mt-1">
                              <Input
                                value={githubGistId}
                                onChange={(e) =>
                                  setGithubGistId(e.target.value)
                                }
                                placeholder="e.g., a1b2c3d4e5f6g7h8i9j0"
                                className="max-w-md"
                              />
                            </div>
                          </li>
                        </ol>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {twitterHandle && twitterSignature && !isTwitterVerified && (
                <div className="space-y-4">
                  <h3 className="font-medium">X/Twitter Verification</h3>
                  <ol className="list-decimal list-inside space-y-3">
                    <li>Post a tweet with the following content:</li>
                    <li>
                      <div className="bg-gray-100 p-3 rounded mt-1 relative">
                        <pre className="text-sm overflow-x-auto">
                          Verifying my X identity for GitSplits:{" "}
                          {twitterSignature}
                        </pre>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() =>
                            copyToClipboard(
                              `Verifying my X identity for GitSplits: ${twitterSignature}`,
                              "twitter"
                            )
                          }
                        >
                          {copiedTwitter === true ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </li>
                    <li>
                      <Button onClick={postToTwitter} className="mb-4">
                        <Twitter className="mr-2 h-4 w-4" />
                        Post to X/Twitter
                      </Button>
                    </li>
                    <li>
                      <div>After posting, paste your tweet URL here:</div>
                      <div className="flex items-center mt-1">
                        <Input
                          value={tweetUrl}
                          onChange={(e) => setTweetUrl(e.target.value)}
                          placeholder="https://twitter.com/username/status/1234567890"
                          className="max-w-md"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        The tweet URL should look like:
                        https://twitter.com/username/status/1234567890
                      </p>
                    </li>
                  </ol>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={verifyIdentities}
                  disabled={
                    Boolean(isLoading) ||
                    (!!githubUsername && !isGithubVerified && !githubGistId) ||
                    (!!twitterHandle && !isTwitterVerified && !tweetUrl)
                  }
                >
                  Verify Identities
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setVerificationStep("input")}
                >
                  Back
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Verification Levels</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="mx-auto mb-2 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 font-bold">
                1
              </div>
              <div className="font-medium">Basic</div>
              <div className="text-xs text-gray-500 mb-1">
                EVM or NEAR wallet
              </div>
              <div className="text-xs text-gray-600">View splits</div>
            </div>
            <div>
              <div className="mx-auto mb-2 w-8 h-8 flex items-center justify-center rounded-full bg-blue-100 font-bold">
                2
              </div>
              <div className="font-medium">Identity</div>
              <div className="text-xs text-gray-500 mb-1">
                GitHub or X/Twitter + wallet
              </div>
              <div className="text-xs text-gray-600">
                Receive, create splits
              </div>
            </div>
            <div>
              <div className="mx-auto mb-2 w-8 h-8 flex items-center justify-center rounded-full bg-green-100 font-bold">
                3
              </div>
              <div className="font-medium">Full</div>
              <div className="text-xs text-gray-500 mb-1">
                GitHub + X/Twitter + wallet
              </div>
              <div className="text-xs text-gray-600">
                Distribute, create any split
              </div>
            </div>
            <div>
              <div className="mx-auto mb-2 w-8 h-8 flex items-center justify-center rounded-full bg-purple-100 font-bold">
                4
              </div>
              <div className="font-medium">GitSplitter</div>
              <div className="text-xs text-gray-500 mb-1">
                All identities + wallets
              </div>
              <div className="text-xs text-gray-600">
                Full access, governance
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VerificationCenter;
