import { NextResponse } from "next/server";
import axios from "axios";
import crypto from "crypto";
import { VerificationLevel, VerificationRequest } from "@/types";

// In-memory storage for verification requests (in a real app, use a database)
const verificationRequests = new Map<string, VerificationRequest>();

// Verification expiration time (24 hours)
const VERIFICATION_EXPIRATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export async function POST(request: Request) {
  try {
    const { twitterUsername, githubUsername } = await request.json();

    if (!twitterUsername || !githubUsername) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Validate GitHub username
    const isValidGitHub = await validateGitHubUsername(githubUsername);
    if (!isValidGitHub) {
      return NextResponse.json(
        { error: "Invalid GitHub username" },
        { status: 400 }
      );
    }

    // Generate a unique verification code
    const verificationCode = generateVerificationCode();

    // Generate a unique verification ID
    const verificationId = `ver-${Date.now()}-${crypto
      .randomBytes(4)
      .toString("hex")}`;

    // Create a verification request
    const verificationRequest: VerificationRequest = {
      id: verificationId,
      twitterUsername,
      githubUsername,
      verificationCode,
      createdAt: Date.now(),
      expiresAt: Date.now() + VERIFICATION_EXPIRATION,
      status: "pending",
    };

    // Store the verification request
    verificationRequests.set(verificationId, verificationRequest);

    // Return the verification request
    return NextResponse.json({
      success: true,
      verificationId,
      verificationCode,
      expiresAt: verificationRequest.expiresAt,
    });
  } catch (error) {
    console.error("Error initiating GitHub verification:", error);
    return NextResponse.json(
      { error: "Failed to initiate verification" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const verificationId = searchParams.get("id");

  if (!verificationId) {
    return NextResponse.json(
      { error: "Missing verification ID" },
      { status: 400 }
    );
  }

  // Get the verification request
  const verificationRequest = verificationRequests.get(verificationId);
  if (!verificationRequest) {
    return NextResponse.json(
      { error: "Verification request not found" },
      { status: 404 }
    );
  }

  // Check if the verification has expired
  if (Date.now() > verificationRequest.expiresAt) {
    verificationRequest.status = "expired";
    return NextResponse.json({
      success: false,
      status: "expired",
      message: "Verification has expired",
    });
  }

  // Check if the verification is already completed
  if (verificationRequest.status === "completed") {
    return NextResponse.json({
      success: true,
      status: "completed",
      message: "Verification already completed",
    });
  }

  // Check if the verification code exists in the GitHub profile or repository
  const isVerified = await checkGitHubVerification(
    verificationRequest.githubUsername,
    verificationRequest.verificationCode
  );

  if (isVerified) {
    // Update the verification status
    verificationRequest.status = "completed";

    // In a real implementation, you would update the user's verification level in the database
    // and link the GitHub identity to the Twitter account

    return NextResponse.json({
      success: true,
      status: "completed",
      message: "Verification completed successfully",
    });
  } else {
    return NextResponse.json({
      success: false,
      status: "pending",
      message:
        "Verification code not found. Please add the code to your GitHub profile or create a repository with the code as the name.",
    });
  }
}

/**
 * Validate a GitHub username
 */
async function validateGitHubUsername(username: string): Promise<boolean> {
  try {
    const response = await axios.get(`https://api.github.com/users/${username}`, {
      headers: {
        Authorization: `token ${process.env.GITHUB_TOKEN}`,
      },
    });

    return response.status === 200;
  } catch (error) {
    console.error("Error validating GitHub username:", error);
    return false;
  }
}

/**
 * Generate a unique verification code
 */
function generateVerificationCode(): string {
  const prefix = "gitsplits-verify-";
  const randomString = crypto.randomBytes(8).toString("hex");
  return `${prefix}${randomString}`;
}

/**
 * Check if the verification code exists in the GitHub profile or repository
 */
async function checkGitHubVerification(
  githubUsername: string,
  verificationCode: string
): Promise<boolean> {
  try {
    // Check if the user has a repository with the verification code as the name
    const reposResponse = await axios.get(
      `https://api.github.com/users/${githubUsername}/repos`,
      {
        headers: {
          Authorization: `token ${process.env.GITHUB_TOKEN}`,
        },
      }
    );

    const hasRepo = reposResponse.data.some(
      (repo: any) => repo.name === verificationCode
    );

    if (hasRepo) {
      return true;
    }

    // Check if the user has the verification code in their bio
    const userResponse = await axios.get(
      `https://api.github.com/users/${githubUsername}`,
      {
        headers: {
          Authorization: `token ${process.env.GITHUB_TOKEN}`,
        },
      }
    );

    const bio = userResponse.data.bio || "";
    if (bio.includes(verificationCode)) {
      return true;
    }

    // Check if the user has a gist with the verification code
    const gistsResponse = await axios.get(
      `https://api.github.com/users/${githubUsername}/gists`,
      {
        headers: {
          Authorization: `token ${process.env.GITHUB_TOKEN}`,
        },
      }
    );

    const hasGist = gistsResponse.data.some((gist: any) => {
      const files = Object.values(gist.files || {});
      return files.some(
        (file: any) =>
          file.filename === verificationCode ||
          (file.content && file.content.includes(verificationCode))
      );
    });

    return hasGist;
  } catch (error) {
    console.error("Error checking GitHub verification:", error);
    return false;
  }
}
