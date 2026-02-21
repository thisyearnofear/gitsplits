import { NextRequest, NextResponse } from "next/server";
import {
  verifyGitHub,
  verifyTwitter,
  verifyEvmSignature,
  verifyNearSignature,
} from "@/lib/verification-service";
import { setDoc, doc, Timestamp, Firestore } from "firebase/firestore";
import { db } from "@/lib/firebase";
const REQUEST_TIMEOUT_MS = 20_000;

function getAgentBaseUrl(): string {
  return (
    process.env.CONTROLLER_URL ||
    process.env.AGENT_BASE_URL ||
    "http://localhost:3002"
  );
}

async function syncVerificationToContract(params: {
  githubUsername: string;
  nearAccountId: string;
  walletAddress: string;
}): Promise<void> {
  const agentBaseUrl = getAgentBaseUrl();
  if (!agentBaseUrl) {
    throw new Error(
      "Agent upstream is not configured for contract sync (set CONTROLLER_URL or AGENT_BASE_URL).",
    );
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (process.env.AGENT_API_KEY) {
    headers["x-agent-api-key"] = process.env.AGENT_API_KEY;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const upstream = await fetch(`${agentBaseUrl}/process`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        text: `@gitsplits verify ${params.githubUsername}`,
        author: params.nearAccountId,
        type: "web",
        walletAddress: params.walletAddress,
        nearAccountId: params.nearAccountId,
      }),
      signal: controller.signal,
    });

    const payload = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      throw new Error(
        payload?.error || `Agent sync failed (${upstream.status})`,
      );
    }
    const responseText = String(payload?.response || "");
    if (responseText.includes("❌")) {
      throw new Error(responseText);
    }
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: NextRequest) {
  if (!db) {
    return NextResponse.json(
      { success: false, error: "Firebase not configured" },
      { status: 503 },
    );
  }

  try {
    const body = await request.json();
    const {
      walletAddress,
      githubUsername,
      twitterHandle,
      githubGistId,
      evmSignature,
      evmMessage,
      evmAddress,
      nearSignature,
      nearMessage,
      nearAccountId,
    } = body;

    if (!walletAddress) {
      return NextResponse.json(
        { success: false, error: "Wallet address is required" },
        { status: 400 },
      );
    }

    let githubVerified = false;
    let twitterVerified = false;
    let evmVerified = false;
    let nearVerified = false;
    let contractSynced = false;

    // Verify GitHub identity
    if (githubUsername && githubGistId) {
      githubVerified = await verifyGitHub(
        walletAddress,
        githubUsername,
        githubGistId,
      );
    }

    // Verify Twitter identity
    if (twitterHandle && body.tweetUrl) {
      twitterVerified = await verifyTwitter(
        walletAddress,
        twitterHandle,
        body.tweetUrl,
      );
    }

    // Verify EVM signature
    if (evmSignature && evmMessage && evmAddress) {
      evmVerified = verifyEvmSignature(evmMessage, evmSignature, evmAddress);
    }

    // Verify NEAR signature
    if (nearSignature && nearMessage && nearAccountId) {
      nearVerified = await verifyNearSignature(
        nearMessage,
        nearSignature,
        nearAccountId,
      );
    }

    if (githubVerified && nearVerified && githubUsername && nearAccountId) {
      await syncVerificationToContract({
        githubUsername,
        nearAccountId,
        walletAddress,
      });
      contractSynced = true;
    }

    // Store the verification status in Firestore
    await setDoc(
      doc(db, "verifications", walletAddress),
      {
        ...(githubUsername !== undefined ? { githubUsername } : {}),
        githubVerified,
        githubVerifiedAt: githubVerified ? Timestamp.now() : null,
        ...(twitterHandle !== undefined ? { twitterHandle } : {}),
        twitterVerified,
        twitterVerifiedAt: twitterVerified ? Timestamp.now() : null,
        ...(evmAddress !== undefined ? { evmAddress } : {}),
        evmVerified,
        evmVerifiedAt: evmVerified ? Timestamp.now() : null,
        ...(nearAccountId !== undefined ? { nearAccountId } : {}),
        nearVerified,
        nearVerifiedAt: nearVerified ? Timestamp.now() : null,
      },
      { merge: true },
    );

    // Log verification status
    console.log("Verification status:", {
      walletAddress,
      githubUsername,
      twitterHandle,
      githubVerified,
      twitterVerified,
      evmVerified,
      nearVerified,
    });

    return NextResponse.json({
      success: true,
      githubVerified,
      twitterVerified,
      evmVerified,
      nearVerified,
      contractSynced,
    });
  } catch (error) {
    console.error("Error verifying identities:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to verify identities",
      },
      { status: 500 },
    );
  }
}
