/**
 * Parse a command from a tweet
 */
export function parseCommand(tweetText: string): {
  command: string;
  args: Record<string, any>;
} {
  // Convert to lowercase for case-insensitive matching
  const lowerText = tweetText.toLowerCase();

  // Remove mentions of @bankrbot and @gitsplits
  const textWithoutMentions = lowerText
    .replace(/@bankrbot/g, "")
    .replace(/@gitsplits/g, "")
    .trim();

  // Check for help command
  if (textWithoutMentions.includes("help")) {
    return {
      command: "help",
      args: {},
    };
  }

  // Check for version command
  if (textWithoutMentions.includes("version")) {
    return {
      command: "version",
      args: {},
    };
  }

  // Check for create command
  if (
    textWithoutMentions.includes("create") ||
    textWithoutMentions.includes("make") ||
    textWithoutMentions.includes("setup") ||
    textWithoutMentions.includes("new")
  ) {
    // Extract repository URL
    const repoUrl = extractRepositoryUrl(textWithoutMentions);
    return {
      command: "create",
      args: {
        repoUrl,
      },
    };
  }

  // Check for info command
  if (
    textWithoutMentions.includes("info") ||
    textWithoutMentions.includes("about") ||
    textWithoutMentions.includes("details") ||
    textWithoutMentions.includes("show")
  ) {
    // Extract repository URL
    const repoUrl = extractRepositoryUrl(textWithoutMentions);
    return {
      command: "info",
      args: {
        repoUrl,
      },
    };
  }

  // Check for distribute command
  if (
    textWithoutMentions.includes("distribute") ||
    textWithoutMentions.includes("send") ||
    textWithoutMentions.includes("pay") ||
    textWithoutMentions.includes("fund")
  ) {
    // Extract amount, token, and repository URL
    const { amount, token } = extractAmountAndToken(textWithoutMentions);
    const repoUrl = extractRepositoryUrl(textWithoutMentions);
    return {
      command: "distribute",
      args: {
        amount,
        token,
        repoUrl,
      },
    };
  }

  // Check for verify command
  if (
    textWithoutMentions.includes("verify") ||
    textWithoutMentions.includes("link") ||
    textWithoutMentions.includes("connect")
  ) {
    // Extract GitHub username
    const githubUsername = extractGitHubUsername(textWithoutMentions);
    return {
      command: "verify",
      args: {
        githubUsername,
      },
    };
  }

  // If we can't determine the command, try to infer it from context
  const repoUrl = extractRepositoryUrl(textWithoutMentions);
  if (repoUrl) {
    // If there's a repository URL, assume it's an info command
    return {
      command: "info",
      args: {
        repoUrl,
      },
    };
  }

  // Default to help command if we can't determine the command
  return {
    command: "help",
    args: {},
  };
}

/**
 * Extract a repository URL from text
 */
function extractRepositoryUrl(text: string): string {
  // Look for github.com URLs
  const githubUrlMatch = text.match(
    /github\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)/
  );
  if (githubUrlMatch) {
    return `github.com/${githubUrlMatch[1]}/${githubUrlMatch[2]}`;
  }

  // Look for user/repo patterns
  const userRepoMatch = text.match(/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)/);
  if (userRepoMatch) {
    return `github.com/${userRepoMatch[1]}/${userRepoMatch[2]}`;
  }

  // Look for "repo" or "repository" followed by a name
  const repoNameMatch = text.match(
    /(?:repo|repository)\s+([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)/i
  );
  if (repoNameMatch) {
    return `github.com/${repoNameMatch[1]}/${repoNameMatch[2]}`;
  }

  return "";
}

/**
 * Extract amount and token from text
 */
function extractAmountAndToken(
  text: string
): { amount: number; token: string } {
  // Look for amount and token pattern (e.g., "100 NEAR")
  const amountTokenMatch = text.match(/(\d+(?:\.\d+)?)\s*([a-zA-Z]+)/);
  if (amountTokenMatch) {
    return {
      amount: parseFloat(amountTokenMatch[1]),
      token: amountTokenMatch[2].toUpperCase(),
    };
  }

  // Look for just an amount
  const amountMatch = text.match(/(\d+(?:\.\d+)?)/);
  if (amountMatch) {
    return {
      amount: parseFloat(amountMatch[1]),
      token: "NEAR", // Default to NEAR
    };
  }

  return {
    amount: 0,
    token: "NEAR",
  };
}

/**
 * Extract a GitHub username from text
 */
function extractGitHubUsername(text: string): string {
  // Look for "verify" or "link" followed by a username
  const verifyMatch = text.match(/(?:verify|link|connect)\s+(@?)([a-zA-Z0-9_-]+)/i);
  if (verifyMatch) {
    return verifyMatch[2];
  }

  // Look for a GitHub username pattern
  const usernameMatch = text.match(/\b([a-zA-Z0-9_-]{3,39})\b/);
  if (usernameMatch) {
    return usernameMatch[1];
  }

  return "";
}
