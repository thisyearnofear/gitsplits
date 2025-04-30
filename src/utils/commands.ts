import axios from "axios";
import { parseCommand } from "./parser";
import { getRepoInfo } from "./api";
import { VerificationLevel } from "@/types";
import { twitterClient } from "./twitter";
import { processTwitterCommand } from "./near";

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

    // Handle special commands that don't need contract interaction
    if (command.toLowerCase() === "help") {
      await sendTwitterReply(tweetId, getHelpMessage());
      return;
    }

    if (command.toLowerCase() === "version") {
      await sendTwitterReply(tweetId, getVersionMessage());
      return;
    }

    // Process the command using the NEAR contract
    const result = await processTwitterCommand(command, args, tweetId, sender);

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

// These command handlers have been moved to src/utils/near.ts

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
    // Check if message is too long for Twitter (280 chars max)
    if (message.length > 280) {
      console.log("Message too long for Twitter, truncating and adding link");

      // Create a unique ID for this message
      const messageId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      // Store the full message (in a real implementation, this would be in a database)
      // For now, we'll just log it
      console.log(`Full message (${messageId}): ${message}`);

      // Create a shortened message with a link to view the full message
      const shortMessage = message.substring(0, 230) +
        `... \n\nView full message: https://gitsplits.example.com/messages/${messageId}`;

      // Send the shortened message
      const replyId = await twitterClient.sendReply(tweetId, shortMessage);
      return !!replyId;
    }

    // Send the reply using the Twitter client
    const replyId = await twitterClient.sendReply(tweetId, message);
    return !!replyId;
  } catch (error) {
    console.error("Error sending Twitter reply:", error);
    return false;
  }
}

// These helper functions have been moved to src/utils/near.ts
