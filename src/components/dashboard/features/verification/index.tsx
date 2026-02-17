"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, RefreshCw } from "lucide-react";
import { useVerification } from "./hooks/useVerification";
import { VerificationProgress } from "./components/VerificationProgress";
import { IdentityVerification } from "./components/IdentityVerification";
import { WalletVerification } from "./components/WalletVerification";

interface VerificationCenterProps {
  walletAddress?: string;
}

export const VerificationCenter: React.FC<VerificationCenterProps> = ({
  walletAddress,
}) => {
  const {
    verificationLevel,
    statusMessage,
    isLoading,
    githubUsername,
    twitterHandle,
    tweetUrl,
    githubSignature,
    twitterSignature,
    isGithubVerified,
    isTwitterVerified,
    isEvmVerified,
    isNearVerified,
    copiedGithub,
    copiedTwitter,
    isEvmConnected,
    isNearConnected,
    evmAddress,
    nearAccountId,
    resolvedWalletAddress,
    setGithubUsername,
    setTwitterHandle,
    generateCode,
    verifyEvm,
    verifyNear,
    submitVerification,
    copyToClipboard,
    postToTwitter,
    fetchVerificationStatus,
  } = useVerification(walletAddress);

  const canSubmit = resolvedWalletAddress && (
    (githubSignature && githubUsername) ||
    (twitterSignature && twitterHandle) ||
    isEvmVerified ||
    isNearVerified
  );

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Your Verification Status</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchVerificationStatus}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </CardHeader>
        <CardContent>
          <VerificationProgress level={verificationLevel} />
        </CardContent>
      </Card>

      {/* Status Message */}
      {statusMessage && (
        <Alert variant={statusMessage.includes("Error") || statusMessage.includes("failed") ? "destructive" : "default"}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{statusMessage}</AlertDescription>
        </Alert>
      )}

      {/* Wallet Verification */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <WalletVerification
          type="evm"
          isConnected={isEvmConnected}
          isVerified={isEvmVerified}
          address={evmAddress}
          onVerify={verifyEvm}
        />
        <WalletVerification
          type="near"
          isConnected={isNearConnected}
          isVerified={isNearVerified}
          address={nearAccountId}
          onVerify={verifyNear}
        />
      </div>

      {/* Identity Verification */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <IdentityVerification
          platform="github"
          username={githubUsername}
          signature={githubSignature}
          isVerified={isGithubVerified}
          copied={copiedGithub}
          onUsernameChange={setGithubUsername}
          onGenerate={() => generateCode("github")}
          onCopy={() => copyToClipboard(githubSignature, "github")}
        />
        <IdentityVerification
          platform="twitter"
          username={twitterHandle}
          signature={twitterSignature}
          isVerified={isTwitterVerified}
          copied={copiedTwitter}
          onUsernameChange={setTwitterHandle}
          onGenerate={() => generateCode("twitter")}
          onCopy={() => copyToClipboard(twitterSignature, "twitter")}
          onPostToTwitter={postToTwitter}
        />
      </div>

      {/* Submit Button */}
      {canSubmit && (
        <Button 
          onClick={submitVerification} 
          disabled={isLoading}
          className="w-full"
          size="lg"
        >
          {isLoading ? "Verifying..." : "Verify Identities"}
        </Button>
      )}
    </div>
  );
};

export default VerificationCenter;
