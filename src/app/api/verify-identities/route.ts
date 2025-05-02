import { NextRequest, NextResponse } from "next/server";
import {
  verifyGitHub,
  verifyTwitter,
  verifyEvmSignature,
  verifyNearSignature,
} from "@/lib/verification-service";
import { setDoc, doc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function POST(request: NextRequest) {
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
        { status: 400 }
      );
    }

    let githubVerified = false;
    let twitterVerified = false;
    let evmVerified = false;
    let nearVerified = false;

    // Verify GitHub identity
    if (githubUsername && githubGistId) {
      githubVerified = await verifyGitHub(
        walletAddress,
        githubUsername,
        githubGistId
      );
    }

    // Verify Twitter identity
    if (twitterHandle && body.tweetUrl) {
      twitterVerified = await verifyTwitter(
        walletAddress,
        twitterHandle,
        body.tweetUrl
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
        nearAccountId
      );
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
      { merge: true }
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
    });
  } catch (error) {
    console.error("Error verifying identities:", error);
    return NextResponse.json(
      { success: false, error: "Failed to verify identities" },
      { status: 500 }
    );
  }
}
