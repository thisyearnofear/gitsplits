"use client";

import { useState, useEffect, useCallback } from "react";
import { useAppKitAccount } from "@reown/appkit/react";
import { useNearWallet } from "@/hooks/useNearWallet";
import { useSignMessage } from "wagmi";
import { Buffer } from "buffer";

export type VerificationStep = "input" | "signature" | "verify";
export type VerificationLevel = 1 | 2 | 3 | 4;

export interface VerificationStatus {
  githubVerified: boolean;
  twitterVerified: boolean;
  evmVerified: boolean;
  nearVerified: boolean;
  githubUsername?: string;
  twitterHandle?: string;
}

export interface PendingDistribution {
  id: string;
  repo: string;
  amount: string;
  token: string;
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

function normalizeNearSignature(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value instanceof Uint8Array) return Buffer.from(value).toString("base64");
  if (Array.isArray(value)) return Buffer.from(value).toString("base64");
  if (typeof value === "object" && value !== null) {
    return normalizeNearSignature((value as { signature?: unknown }).signature);
  }
  return String(value);
}

export function useVerification(externalWalletAddress?: string) {
  const [verificationLevel, setVerificationLevel] = useState<VerificationLevel>(1);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form state
  const [githubUsername, setGithubUsername] = useState("");
  const [twitterHandle, setTwitterHandle] = useState("");
  const [tweetUrl, setTweetUrl] = useState("");
  const [verificationStep, setVerificationStep] = useState<VerificationStep>("input");
  
  // Signature state
  const [githubSignature, setGithubSignature] = useState("");
  const [twitterSignature, setTwitterSignature] = useState("");
  const [evmSig, setEvmSig] = useState("");
  const [nearSig, setNearSig] = useState("");
  const [nearMessageToVerify, setNearMessageToVerify] = useState("");
  
  // Verification status
  const [isGithubVerified, setIsGithubVerified] = useState(false);
  const [isTwitterVerified, setIsTwitterVerified] = useState(false);
  const [isEvmVerified, setIsEvmVerified] = useState(false);
  const [isNearVerified, setIsNearVerified] = useState(false);
  
  // UI state
  const [copiedGithub, setCopiedGithub] = useState(false);
  const [copiedTwitter, setCopiedTwitter] = useState(false);
  const [pendingDistributions, setPendingDistributions] = useState<PendingDistribution[]>([]);

  // Wallet connections
  const { isConnected: isEvmConnected, address: evmAddress } = useAppKitAccount();
  const { isConnected: isNearConnected, accountId: nearAccountId, selector } = useNearWallet();
  const { signMessageAsync } = useSignMessage();

  const cleanWalletAddress = (value?: string | null) =>
    value && value !== "Unknown NEAR Account" ? value : "";

  const resolvedWalletAddress =
    cleanWalletAddress(externalWalletAddress) ||
    cleanWalletAddress(nearAccountId) ||
    cleanWalletAddress(evmAddress) ||
    "";

  // Calculate verification level
  useEffect(() => {
    let level: VerificationLevel = 1;
    if ((isGithubVerified || isTwitterVerified) && (isEvmVerified || isNearVerified)) {
      level = 2;
    }
    if (isGithubVerified && isTwitterVerified && (isEvmVerified || isNearVerified)) {
      level = 3;
    }
    if (isGithubVerified && isTwitterVerified && isEvmVerified && isNearVerified) {
      level = 4;
    }
    setVerificationLevel(level);
  }, [isGithubVerified, isTwitterVerified, isEvmVerified, isNearVerified]);

  // Fetch verification status
  const fetchVerificationStatus = useCallback(async () => {
    if (!resolvedWalletAddress) return;
    
    try {
      setIsLoading(true);
      setStatusMessage("Checking verification status...");

      const response = await fetch(`/api/verification-status?wallet=${resolvedWalletAddress}`);
      const data = await response.json();

      if (data.success) {
        setIsGithubVerified(data.githubVerified);
        setIsTwitterVerified(data.twitterVerified);
        setIsEvmVerified(data.evmVerified);
        setIsNearVerified(data.nearVerified);
        
        if (data.githubUsername) {
          setGithubUsername(data.githubUsername);
        }
        if (data.twitterHandle) {
          setTwitterHandle(data.twitterHandle);
        }
        
        setStatusMessage(null);
      }
    } catch (err: any) {
      setStatusMessage(`Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [resolvedWalletAddress]);

  // Load on mount
  useEffect(() => {
    if (resolvedWalletAddress) {
      fetchVerificationStatus();
    }
  }, [resolvedWalletAddress, fetchVerificationStatus]);

  // Generate verification code
  const generateCode = useCallback(async (platform: "github" | "twitter") => {
    if (!resolvedWalletAddress) return;
    
    try {
      setIsLoading(true);
      setStatusMessage(`Generating ${platform} verification code...`);

      const response = await fetch("/api/generate-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: resolvedWalletAddress,
          platform,
          username: platform === "github" ? githubUsername : twitterHandle,
        }),
      });

      const data = await response.json();

      if (data.success) {
        if (platform === "github") {
          setGithubSignature(data.code);
        } else {
          setTwitterSignature(data.code);
        }
        setVerificationStep("signature");
        setStatusMessage(`${platform} verification code generated!`);
      } else {
        setStatusMessage(`Failed: ${data.error}`);
      }
    } catch (err: any) {
      setStatusMessage(`Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [resolvedWalletAddress, githubUsername, twitterHandle]);

  // EVM verification
  const verifyEvm = useCallback(async () => {
    if (!isEvmConnected || !evmAddress || !signMessageAsync) return;
    
    try {
      setIsLoading(true);
      setStatusMessage("Signing EVM message...");
      
      const message = `Sign this message to verify your EVM address for GitSplits: ${evmAddress}`;
      const signature = await signMessageAsync({ message });
      
      setEvmSig(signature as string);
      setStatusMessage("Verifying EVM signature...");
      
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
      if (data.success && data.evmVerified) {
        setIsEvmVerified(true);
        setStatusMessage("EVM wallet verified!");
      } else {
        setStatusMessage(`EVM verification failed: ${data.error || "Unknown error"}`);
      }
    } catch (err: any) {
      setStatusMessage("EVM verification failed");
    } finally {
      setIsLoading(false);
    }
  }, [isEvmConnected, evmAddress, signMessageAsync, resolvedWalletAddress]);

  // NEAR verification
  const verifyNear = useCallback(async () => {
    if (!isNearConnected || !nearAccountId || !selector) return;
    
    try {
      setIsLoading(true);
      setStatusMessage("Signing NEAR message...");
      
      const message = `Sign this message to verify your NEAR address for GitSplits: ${nearAccountId}`;
      const wallet = await selector.wallet();
      const params: any = { message, recipient: nearAccountId, nonce: createNearNonce() };
      
      const signed: any = await wallet.signMessage(params);
      const signature = normalizeNearSignature(signed);
      
      if (!signature) throw new Error("No signature returned");
      
      setNearSig(signature);
      setNearMessageToVerify(message);
      setStatusMessage("NEAR signature generated. Click 'Verify Identities' to complete.");
    } catch (err: any) {
      setStatusMessage("Failed to sign NEAR message: " + err.message);
    } finally {
      setIsLoading(false);
    }
  }, [isNearConnected, nearAccountId, selector]);

  // Submit all verifications
  const submitVerification = useCallback(async () => {
    try {
      setIsLoading(true);
      setStatusMessage("Verifying your identities...");

      const response = await fetch("/api/verify-identities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: resolvedWalletAddress,
          githubUsername,
          twitterHandle,
          githubSignature,
          twitterSignature,
          tweetUrl,
          evmSignature: evmSig,
          nearSignature: nearSig,
          nearMessage: nearMessageToVerify,
          nearAccountId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setIsGithubVerified(data.githubVerified || isGithubVerified);
        setIsTwitterVerified(data.twitterVerified || isTwitterVerified);
        setIsEvmVerified(data.evmVerified || isEvmVerified);
        setIsNearVerified(data.nearVerified || isNearVerified);
        setStatusMessage("Verification successful!");
        setVerificationStep("input");
      } else {
        setStatusMessage(`Verification failed: ${data.error || "Unknown error"}`);
      }
    } catch (err: any) {
      setStatusMessage(`Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [resolvedWalletAddress, githubUsername, twitterHandle, githubSignature, twitterSignature, tweetUrl, evmSig, nearSig, nearMessageToVerify, nearAccountId, isGithubVerified, isTwitterVerified, isEvmVerified, isNearVerified]);

  // Copy to clipboard
  const copyToClipboard = useCallback((text: string, type: "github" | "twitter") => {
    navigator.clipboard.writeText(text);
    if (type === "github") {
      setCopiedGithub(true);
      setTimeout(() => setCopiedGithub(false), 2000);
    } else {
      setCopiedTwitter(true);
      setTimeout(() => setCopiedTwitter(false), 2000);
    }
  }, []);

  // Post to Twitter
  const postToTwitter = useCallback(() => {
    if (!twitterSignature) return;
    const text = `Verifying my X identity for GitSplits: ${twitterSignature}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
  }, [twitterSignature]);

  return {
    // State
    verificationLevel,
    statusMessage,
    isLoading,
    githubUsername,
    twitterHandle,
    tweetUrl,
    verificationStep,
    githubSignature,
    twitterSignature,
    isGithubVerified,
    isTwitterVerified,
    isEvmVerified,
    isNearVerified,
    copiedGithub,
    copiedTwitter,
    pendingDistributions,
    isEvmConnected,
    isNearConnected,
    evmAddress,
    nearAccountId,
    resolvedWalletAddress,
    
    // Setters
    setGithubUsername,
    setTwitterHandle,
    setTweetUrl,
    setVerificationStep,
    
    // Actions
    generateCode,
    verifyEvm,
    verifyNear,
    submitVerification,
    copyToClipboard,
    postToTwitter,
    fetchVerificationStatus,
  };
}
