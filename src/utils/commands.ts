import axios from "axios";
import { parseCommand } from "./parser";
import { getRepoInfo } from "./api";
import { VerificationLevel } from "@/types";

// Rate limiting maps
const userCommandsMap = new Map<string, number[]>();
const distributionCommandsMap = new Map<string, number[]>();
const verificationAttemptsMap = new Map<string, number[]>();

// Rate limit windows
const HOURLY_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds
const DAILY_WINDOW = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Rate limit thresholds
const MAX_COMMANDS_PER_HOUR = 10;
const MAX_DISTRIBUTIONS_PER_DAY = 3;
const MAX_VERIFICATIONS_PER_DAY = 5;

/**
 * Process a command from Twitter
 */
export async function processCommand(
  tweetText: string,
  sender: string,
  tweetId: string
) {
  try {
    // Check rate limits
    if (!checkRateLimits(sender, tweetText)) {
      await sendTwitterReply(
        tweetId,
        "⚠️ Rate limit exceeded. Please try again later."
      );
      return;
    }

    // Parse the command
    const { command, args } = parseCommand(tweetText);

    // Process the command
    let result;
    switch (command.toLowerCase()) {
      case "create":
        result = await handleCreateCommand(args.repoUrl, sender);
        break;
      case "info":
        result = await handleInfoCommand(args.repoUrl);
        break;
      case "distribute":
        result = await handleDistributeCommand(
          args.repoUrl,
          args.amount,
          args.token || "NEAR"
        );
        break;
      case "verify":
        result = await handleVerifyCommand(args.githubUsername, sender);
        break;
      case "help":
        result = {
          success: true,
          message: getHelpMessage(),
        };
        break;
      case "version":
        result = {
          success: true,
          message: getVersionMessage(),
        };
        break;
      default:
        result = {
          success: false,
          message: `Unknown command: ${command}. Try '@bankrbot @gitsplits help' for a list of commands.`,
        };
    }

    // Send the reply
    await sendTwitterReply(tweetId, result.message);
  } catch (error) {
    console.error("Error processing command:", error);
    await sendTwitterReply(
      tweetId,
      "❌ An error occurred while processing your command. Please try again later."
    );
  }
}

/**
 * Check rate limits for a user
 */
function checkRateLimits(sender: string, tweetText: string): boolean {
  const now = Date.now();
  const lowerText = tweetText.toLowerCase();

  // Check general command rate limit
  const userCommands = userCommandsMap.get(sender) || [];
  const recentUserCommands = userCommands.filter(
    (time) => now - time < HOURLY_WINDOW
  );

  if (recentUserCommands.length >= MAX_COMMANDS_PER_HOUR) {
    return false;
  }

  // Update general command history
  userCommandsMap.set(sender, [...recentUserCommands, now]);

  // Check distribution command rate limit
  if (lowerText.includes("distribute")) {
    const distributionCommands = distributionCommandsMap.get(sender) || [];
    const recentDistributionCommands = distributionCommands.filter(
      (time) => now - time < DAILY_WINDOW
    );

    if (recentDistributionCommands.length >= MAX_DISTRIBUTIONS_PER_DAY) {
      return false;
    }

    // Update distribution command history
    distributionCommandsMap.set(sender, [...recentDistributionCommands, now]);
  }

  // Check verification command rate limit
  if (lowerText.includes("verify")) {
    // Extract GitHub username
    const match = lowerText.match(/verify\s+(\S+)/i);
    if (match && match[1]) {
      const githubUsername = match[1];
      const verificationAttempts =
        verificationAttemptsMap.get(githubUsername) || [];
      const recentVerificationAttempts = verificationAttempts.filter(
        (time) => now - time < DAILY_WINDOW
      );

      if (recentVerificationAttempts.length >= MAX_VERIFICATIONS_PER_DAY) {
        return false;
      }

      // Update verification attempt history
      verificationAttemptsMap.set(githubUsername, [
        ...recentVerificationAttempts,
        now,
      ]);
    }
  }

  return true;
}

/**
 * Handle the create command
 */
async function handleCreateCommand(repoUrl: string, sender: string) {
  try {
    // Validate repository URL
    if (!repoUrl) {
      return {
        success: false,
        message:
          "❌ Missing repository URL. Usage: @bankrbot @gitsplits create github.com/user/repo",
      };
    }

    // Normalize repository URL
    const normalizedUrl = normalizeRepoUrl(repoUrl);

    // Fetch repository data
    const repoInfo = await getRepoInfo(normalizedUrl);

    // Check if the repository exists
    if (!repoInfo) {
      return {
        success: false,
        message: `❌ Repository not found: ${normalizedUrl}`,
      };
    }

    // Check if the user has the required verification level
    const verificationLevel = await getUserVerificationLevel(sender);
    if (verificationLevel < VerificationLevel.Basic) {
      return {
        success: false,
        message:
          "❌ Your account needs to be at least 3 months old with a minimum number of followers to create splits. Please verify your GitHub identity with '@bankrbot @gitsplits verify your-github-username'",
      };
    }

    // Call the API to create the split
    const response = await axios.post("/api/commands", {
      command: "create",
      repo_url: normalizedUrl,
      sender,
    });

    if (response.data.success) {
      const splitId = response.data.result.splitId;
      return {
        success: true,
        message: `✅ Split created for ${repoInfo.owner}/${repoInfo.name}!\n\n${formatContributors(
          repoInfo.contributors
        )}\n\nView details: https://gitsplits.example.com/splits/${splitId}`,
        splitId,
      };
    } else {
      return {
        success: false,
        message: `❌ Failed to create split: ${response.data.message}`,
      };
    }
  } catch (error) {
    console.error("Error handling create command:", error);
    return {
      success: false,
      message: `❌ Error creating split: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}

/**
 * Handle the info command
 */
async function handleInfoCommand(repoUrl: string) {
  try {
    // Validate repository URL
    if (!repoUrl) {
      return {
        success: false,
        message:
          "❌ Missing repository URL. Usage: @bankrbot @gitsplits info github.com/user/repo",
      };
    }

    // Normalize repository URL
    const normalizedUrl = normalizeRepoUrl(repoUrl);

    // Call the API to get split info
    const response = await axios.post("/api/commands", {
      command: "info",
      repo_url: normalizedUrl,
    });

    if (response.data.success) {
      const result = response.data.result;
      return {
        success: true,
        message: result.message,
      };
    } else {
      return {
        success: false,
        message: `❌ Failed to get split info: ${response.data.message}`,
      };
    }
  } catch (error) {
    console.error("Error handling info command:", error);
    return {
      success: false,
      message: `❌ Error getting split info: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}

/**
 * Handle the distribute command
 */
async function handleDistributeCommand(
  repoUrl: string,
  amount: number,
  token: string
) {
  try {
    // Validate parameters
    if (!repoUrl) {
      return {
        success: false,
        message:
          "❌ Missing repository URL. Usage: @bankrbot @gitsplits distribute 100 NEAR to github.com/user/repo",
      };
    }

    if (!amount || amount <= 0) {
      return {
        success: false,
        message: "❌ Invalid amount. Amount must be a positive number.",
      };
    }

    // Normalize repository URL
    const normalizedUrl = normalizeRepoUrl(repoUrl);

    // Call the API to distribute funds
    const response = await axios.post("/api/commands", {
      command: "distribute",
      repo_url: normalizedUrl,
      amount,
      token,
    });

    if (response.data.success) {
      const result = response.data.result;
      return {
        success: true,
        message: result.message,
        distributionId: result.distributionId,
      };
    } else {
      return {
        success: false,
        message: `❌ Failed to distribute funds: ${response.data.message}`,
      };
    }
  } catch (error) {
    console.error("Error handling distribute command:", error);
    return {
      success: false,
      message: `❌ Error distributing funds: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}

/**
 * Handle the verify command
 */
async function handleVerifyCommand(githubUsername: string, sender: string) {
  try {
    // Validate GitHub username
    if (!githubUsername) {
      return {
        success: false,
        message:
          "❌ Missing GitHub username. Usage: @bankrbot @gitsplits verify your-github-username",
      };
    }

    // Generate a unique verification code
    const verificationCode = generateVerificationCode();

    // Call the API to initiate verification
    const response = await axios.post("/api/commands", {
      command: "verify",
      github_username: githubUsername,
      sender,
    });

    if (response.data.success) {
      // Store the verification code for later validation
      // In a real implementation, this would be stored in a database
      const verificationId = response.data.result.verification_id;

      return {
        success: true,
        message: `🔍 Verification initiated for GitHub user: ${githubUsername}\n\nTo complete verification, add this code to your GitHub profile or create a repository with this name:\n\n${verificationCode}\n\nVerification expires in 24 hours.`,
        verificationId,
        verificationCode,
      };
    } else {
      return {
        success: false,
        message: `❌ Failed to initiate verification: ${response.data.message}`,
      };
    }
  } catch (error) {
    console.error("Error handling verify command:", error);
    return {
      success: false,
      message: `❌ Error initiating verification: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}

/**
 * Get the help message
 */
function getHelpMessage(): string {
  return `📚 GitSplits X Agent Commands:

1️⃣ Create a split:
   @bankrbot @gitsplits create github.com/user/repo

2️⃣ Get split info:
   @bankrbot @gitsplits info github.com/user/repo

3️⃣ Distribute funds:
   @bankrbot @gitsplits distribute 100 NEAR to github.com/user/repo

4️⃣ Verify GitHub identity:
   @bankrbot @gitsplits verify your-github-username

5️⃣ Get version info:
   @bankrbot @gitsplits version

Learn more at https://gitsplits.example.com`;
}

/**
 * Get the version message
 */
function getVersionMessage(): string {
  return `GitSplits X Agent v0.1.0
Built with NEAR Shade Agents
Worker: TEE-secured (Phala Cloud)
Contract: ${process.env.NEXT_PUBLIC_contractId || "gitsplits.near"}`;
}

/**
 * Send a reply to a tweet
 */
async function sendTwitterReply(tweetId: string, message: string) {
  try {
    // In a real implementation, this would use the Twitter API to send a reply
    console.log(`Sending Twitter reply to tweet ${tweetId}: ${message}`);

    // For now, we'll just log the message
    // In a production environment, you would use the Twitter API client
    return true;
  } catch (error) {
    console.error("Error sending Twitter reply:", error);
    return false;
  }
}

/**
 * Normalize a repository URL
 */
function normalizeRepoUrl(url: string): string {
  // Remove protocol if present
  let normalizedUrl = url.replace(/^https?:\/\//, "");

  // Remove trailing slashes
  normalizedUrl = normalizedUrl.replace(/\/+$/, "");

  // Ensure it starts with github.com
  if (!normalizedUrl.startsWith("github.com")) {
    normalizedUrl = `github.com/${normalizedUrl}`;
  }

  return normalizedUrl;
}

/**
 * Format contributors for display in a tweet
 */
function formatContributors(contributors: any[]): string {
  // Sort contributors by contributions
  const sortedContributors = [...contributors].sort(
    (a, b) => b.contributions - a.contributions
  );

  // Take top 3 contributors
  const topContributors = sortedContributors.slice(0, 3);

  // Calculate total contributions
  const totalContributions = contributors.reduce(
    (sum, contributor) => sum + contributor.contributions,
    0
  );

  // Format the contributors
  return `Top contributors:
${topContributors
  .map(
    (contributor) =>
      `- ${contributor.username}: ${(
        (contributor.contributions / totalContributions) *
        100
      ).toFixed(1)}%`
  )
  .join("\n")}
Total contributors: ${contributors.length}`;
}

/**
 * Generate a unique verification code
 */
function generateVerificationCode(): string {
  const prefix = "gitsplits-verify-";
  const randomString = Math.random().toString(36).substring(2, 10);
  return `${prefix}${randomString}`;
}

/**
 * Get the verification level of a user
 */
async function getUserVerificationLevel(
  twitterUsername: string
): Promise<VerificationLevel> {
  try {
    // In a real implementation, this would check the user's verification level in the database
    // For now, we'll assume all users have Basic verification
    return VerificationLevel.Basic;
  } catch (error) {
    console.error("Error getting user verification level:", error);
    return VerificationLevel.None;
  }
}
