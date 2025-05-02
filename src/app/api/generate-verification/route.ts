import { NextResponse } from "next/server";
import { generateVerificationCode } from "@/lib/verification-service";

/**
 * Generate verification codes for GitHub and Twitter
 *
 * This endpoint generates unique verification codes that include the wallet address
 * for security. These codes will be used in the verification process.
 */
export async function POST(request: Request) {
  try {
    const { walletAddress, githubUsername, twitterHandle } = await request.json();

    if (!walletAddress) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    const response: any = {
      success: true,
    };

    // Generate GitHub verification code
    if (githubUsername) {
      const githubVerificationCode = await generateVerificationCode(
        walletAddress,
        'github',
        githubUsername
      );
      response.githubVerificationCode = githubVerificationCode;
    }

    // Generate Twitter verification code
    if (twitterHandle) {
      const twitterVerificationCode = await generateVerificationCode(
        walletAddress,
        'twitter',
        twitterHandle
      );
      response.twitterVerificationCode = twitterVerificationCode;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error generating verification codes:", error);
    return NextResponse.json(
      { error: "Failed to generate verification codes" },
      { status: 500 }
    );
  }
}
