// GitSplits Worker Agent
// This agent runs in a TEE (Trusted Execution Environment) and handles
// communication between X (Twitter), GitHub, and the NEAR contract.

const { connect, keyStores, KeyPair, Contract } = require("near-api-js");
const { Octokit } = require("@octokit/rest");
const Twitter2FAClient = require("./twitter2FAClient");
const express = require("express");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const verificationRoutes = require("./api/verification");

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
app.use(bodyParser.json());

// Add verification API routes
app.use("/api", verificationRoutes);

// NEAR configuration
const nearConfig = {
  networkId: process.env.NEAR_NETWORK_ID || "mainnet",
  nodeUrl: process.env.NEAR_NODE_URL || "https://rpc.mainnet.near.org",
  contractName:
    process.env.NEAR_CONTRACT_ID || "gitsplits-worker.papajams.near",
  walletUrl: process.env.NEAR_WALLET_URL || "https://wallet.mainnet.near.org",
  helperUrl: process.env.NEAR_HELPER_URL || "https://helper.mainnet.near.org",
};

// GitHub configuration
const githubConfig = {
  auth: process.env.GITHUB_TOKEN,
};

// Twitter configuration
const twitterConfig = {
  // Cookie-based auth credentials (preferred)
  authToken: process.env.TWITTER_COOKIES_AUTH_TOKEN,
  ct0: process.env.TWITTER_COOKIES_CT0,
  guestId: process.env.TWITTER_COOKIES_GUEST_ID,

  // 2FA auth credentials (fallback)
  username: process.env.TWITTER_USERNAME,
  password: process.env.TWITTER_PASSWORD,
  twoFASecret: process.env.TWITTER_2FA_SECRET,

  // General Twitter config
  screenName: process.env.TWITTER_SCREEN_NAME || "gitsplits",
};

// Worker agent state
let nearConnection = null;
let nearContract = null;
let githubClient = null;
let twitterClient = null;

/**
 * Initialize all external connections
 */
async function initializeConnections() {
  let nearInitialized = false;
  let githubInitialized = false;
  let twitterInitialized = false;

  // Initialize NEAR connection
  try {
    console.log("Initializing NEAR connection...");

    if (!process.env.NEAR_PRIVATE_KEY) {
      console.error("NEAR_PRIVATE_KEY is not defined in environment variables");
      throw new Error("Missing NEAR credentials");
    }

    if (!process.env.NEAR_ACCOUNT_ID) {
      console.error("NEAR_ACCOUNT_ID is not defined in environment variables");
      throw new Error("Missing NEAR account ID");
    }

    const keyStore = new keyStores.InMemoryKeyStore();

    // Load private key from environment variable
    const keyPair = KeyPair.fromString(process.env.NEAR_PRIVATE_KEY);
    await keyStore.setKey(
      nearConfig.networkId,
      process.env.NEAR_ACCOUNT_ID,
      keyPair
    );

    console.log(`Added key for account: ${process.env.NEAR_ACCOUNT_ID}`);

    nearConnection = await connect({
      deps: { keyStore },
      ...nearConfig,
    });

    // Get account object
    const account = await nearConnection.account(process.env.NEAR_ACCOUNT_ID);
    console.log(`Connected to account: ${account.accountId}`);

    // Initialize contract
    nearContract = new Contract(account, nearConfig.contractName, {
      viewMethods: [
        "is_worker_registered",
        "get_split",
        "get_split_by_repo",
        "is_github_verified",
        "get_x_username",
        "get_wallet_address",
        "get_pending_distributions",
        "get_github_by_wallet",
      ],
      changeMethods: [
        "register_worker",
        "create_split",
        "update_split",
        "generate_chain_signature",
        "store_verification",
        "store_pending_distribution",
        "process_pending_distributions",
      ],
    });

    // Make contract available globally
    global.nearContract = nearContract;

    nearInitialized = true;
    console.log("NEAR connection initialized successfully");
  } catch (error) {
    console.error("Error initializing NEAR connection:", error);
    console.log("Continuing without NEAR connection");
  }

  // Initialize GitHub client
  try {
    console.log("Initializing GitHub client...");

    if (!process.env.GITHUB_TOKEN) {
      console.error("GITHUB_TOKEN is not defined in environment variables");
      throw new Error("Missing GitHub token");
    }

    githubClient = new Octokit(githubConfig);
    githubInitialized = true;
    console.log("GitHub client initialized successfully");
  } catch (error) {
    console.error("Error initializing GitHub client:", error);
    console.log("Continuing without GitHub client");
  }

  // Initialize Twitter client
  try {
    console.log("Initializing Twitter client...");

    if (
      !process.env.TWITTER_USERNAME ||
      !process.env.TWITTER_PASSWORD ||
      !process.env.TWITTER_2FA_SECRET
    ) {
      console.error("Twitter credentials not provided");
      throw new Error("Missing Twitter credentials");
    }

    twitterClient = new Twitter2FAClient(twitterConfig);
    twitterInitialized = true;
    console.log("Twitter client initialized successfully");
  } catch (error) {
    console.error("Error initializing Twitter client:", error);
    console.log("Continuing without Twitter client");
  }

  // Return overall status
  const allInitialized =
    nearInitialized && githubInitialized && twitterInitialized;
  console.log(
    `Initialization complete. All services initialized: ${allInitialized}`
  );

  return allInitialized;
}

/**
 * Parse GitHub repository URL to extract owner and repo name
 * @param {string} repoUrl - GitHub repository URL
 * @returns {Object} - { owner, repo }
 */
function parseGitHubUrl(repoUrl) {
  try {
    // Handle different URL formats
    let cleanUrl = repoUrl;

    // Remove protocol and www if present
    cleanUrl = cleanUrl.replace(/^(https?:\/\/)?(www\.)?/, "");

    // Handle github.com URLs
    if (cleanUrl.startsWith("github.com/")) {
      cleanUrl = cleanUrl.substring("github.com/".length);
    }

    // Split by slash to get owner and repo
    const parts = cleanUrl.split("/");
    if (parts.length < 2) {
      throw new Error("Invalid GitHub URL format");
    }

    return {
      owner: parts[0],
      repo: parts[1].replace(".git", ""), // Remove .git if present
    };
  } catch (error) {
    console.error("Error parsing GitHub URL:", error);
    throw new Error("Invalid GitHub repository URL");
  }
}

/**
 * Check if repository exists
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<boolean>} - Whether the repository exists
 */
async function checkRepositoryExists(owner, repo) {
  try {
    await githubClient.repos.get({ owner, repo });
    return true;
  } catch (error) {
    if (error.status === 404) {
      return false;
    }
    throw error;
  }
}

/**
 * Analyze GitHub repository contributions
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<Array>} - Contributors with percentages
 */
async function analyzeContributions(owner, repo) {
  try {
    // Check if GitHub client is initialized
    if (!githubClient) {
      throw new Error("GitHub client not initialized");
    }

    // Check if repository exists
    const exists = await checkRepositoryExists(owner, repo);
    if (!exists) {
      throw new Error(`Repository ${owner}/${repo} not found`);
    }

    console.log(`Analyzing contributions for ${owner}/${repo}...`);

    // Get repository contributors from GitHub API
    const { data: contributors } = await githubClient.repos.listContributors({
      owner,
      repo,
      per_page: 100,
    });

    if (!contributors || contributors.length === 0) {
      throw new Error(`No contributors found for ${owner}/${repo}`);
    }

    console.log(
      `Found ${contributors.length} contributors for ${owner}/${repo}`
    );

    // Calculate total contributions
    const totalContributions = contributors.reduce(
      (sum, contributor) => sum + contributor.contributions,
      0
    );

    console.log(`Total contributions: ${totalContributions}`);

    // Calculate percentage for each contributor
    const contributorsWithPercentage = [];
    let totalPercentage = BigInt(0);
    const expectedTotal = BigInt("100000000000000000000000"); // 100% with 24 decimal places

    for (let i = 0; i < contributors.length; i++) {
      const contributor = contributors[i];

      try {
        // Get contributor details
        const { data: user } = await githubClient.users.getByUsername({
          username: contributor.login,
        });

        // Calculate percentage (using NEAR's yoctoNEAR precision)
        let percentage;

        // For the last contributor, use the remaining percentage to ensure total is exactly 100%
        if (i === contributors.length - 1) {
          percentage = (expectedTotal - totalPercentage).toString();
        } else {
          // Calculate percentage as a string to avoid scientific notation issues with BigInt
          const contributionRatio =
            contributor.contributions / totalContributions;
          const expectedTotalNumber = Number(expectedTotal);
          const rawPercentage = contributionRatio * expectedTotalNumber;
          percentage = Math.floor(rawPercentage).toString();

          // Ensure the percentage is a valid integer string without scientific notation
          if (percentage.includes("e")) {
            // Handle scientific notation by converting to a regular number string
            percentage = BigInt(Math.floor(rawPercentage)).toString();
          }

          totalPercentage += BigInt(percentage);
        }

        contributorsWithPercentage.push({
          github_username: contributor.login,
          account_id: null, // Will be filled when user links their NEAR account
          percentage: percentage,
        });

        console.log(
          `Contributor ${contributor.login}: ${percentage} (${(
            (Number(percentage) / Number(expectedTotal)) *
            100
          ).toFixed(2)}%)`
        );
      } catch (error) {
        console.error(
          `Error processing contributor ${contributor.login}:`,
          error
        );
        // Skip this contributor but continue with others
      }
    }

    // Verify total percentage is exactly 100%
    const finalTotal = contributorsWithPercentage.reduce(
      (sum, contributor) => sum + BigInt(contributor.percentage),
      BigInt(0)
    );

    console.log(`Final total percentage: ${finalTotal}`);
    console.log(`Expected total: ${expectedTotal}`);
    console.log(`Difference: ${finalTotal - expectedTotal}`);

    if (finalTotal !== expectedTotal) {
      console.warn(
        `Total percentage (${finalTotal}) does not equal expected total (${expectedTotal}). Adjusting...`
      );

      // Adjust the largest contributor to make the total exactly 100%
      const largestContributor = contributorsWithPercentage.reduce(
        (max, contributor) =>
          BigInt(contributor.percentage) > BigInt(max.percentage)
            ? contributor
            : max,
        { percentage: "0" }
      );

      const adjustment = expectedTotal - finalTotal;
      largestContributor.percentage = (
        BigInt(largestContributor.percentage) + adjustment
      ).toString();

      console.log(
        `Adjusted ${largestContributor.github_username} by ${adjustment} to ${largestContributor.percentage}`
      );
    }

    return contributorsWithPercentage;
  } catch (error) {
    console.error("Error analyzing contributions:", error);
    throw new Error(
      `Failed to analyze repository contributions: ${error.message}`
    );
  }
}

/**
 * Process X (Twitter) command
 * @param {Object} command - Parsed command from X
 * @returns {Promise<Object>} - Response to send back to X
 */
async function processXCommand(command) {
  try {
    switch (command.action) {
      case "analyze":
        return await handleAnalyzeCommand(command);

      case "create":
        return await handleCreateCommand(command);

      case "splits":
        return await handleSplitsCommand(command);

      case "split":
        return await handleSplitDetailsCommand(command);

      case "distribute":
        return await handleDistributeCommand(command);

      case "verify":
        return await handleVerifyCommand(command);

      // Legacy info command handler removed

      case "help":
        return {
          success: true,
          message:
            "🔍 GitSplits Commands:\n\n" +
            "- @gitsplits <repo>: Analyze repository contributions\n" +
            "- @gitsplits create split <repo> [allocation]: Create a split\n" +
            "- @gitsplits splits <repo>: View active splits for a repository\n" +
            "- @gitsplits split <split_id>: View split details\n" +
            "- @gitsplits help: Show this help message\n\n" +
            "For more information, visit: https://gitsplits.xyz",
        };

      default:
        return {
          success: false,
          message:
            "Unknown command. Try @gitsplits help for available commands.",
        };
    }
  } catch (error) {
    console.error("Error processing X command:", error);
    return {
      success: false,
      message: `Error: ${error.message}`,
    };
  }
}

/**
 * Handle analyze command
 * @param {Object} command - Parsed command
 * @returns {Promise<Object>} - Response
 */
async function handleAnalyzeCommand(command) {
  try {
    const repoUrl = command.repo;
    if (!repoUrl) {
      return {
        success: false,
        message: "Please specify a repository name or URL.",
      };
    }

    // Parse GitHub URL
    const { owner, repo } = parseGitHubUrl(repoUrl);

    // Analyze contributions
    let contributors;
    try {
      contributors = await analyzeContributions(owner, repo);

      if (!contributors || contributors.length === 0) {
        return {
          success: false,
          message: `No contributors found for ${repoUrl}. Please check the repository URL.`,
        };
      }

      console.log(
        `Analyzed ${contributors.length} contributors for ${repoUrl}`
      );
    } catch (error) {
      console.error("Error analyzing contributions:", error);
      return {
        success: false,
        message: `Failed to analyze contributions: ${error.message}`,
      };
    }

    // Format contributors for display
    const contributorsDisplay = contributors
      .slice(0, 5) // Show only top 5 contributors
      .map((contributor) => {
        const percentage = (
          (Number(contributor.percentage) / 1e24) *
          100
        ).toFixed(1);
        return `- ${contributor.github_username}: ${percentage}%`;
      })
      .join("\n");

    const moreContributors =
      contributors.length > 5
        ? `\n...and ${contributors.length - 5} more contributors`
        : "";

    return {
      success: true,
      message:
        `📊 Analysis for ${repoUrl}:\n\n` +
        `Contributors:\n${contributorsDisplay}${moreContributors}\n\n` +
        `To create a split with these percentages:\n` +
        `@gitsplits create split ${repoUrl} default\n\n` +
        `Or specify custom percentages:\n` +
        `@gitsplits create split ${repoUrl} 50/30/20/...`,
    };
  } catch (error) {
    console.error("Error handling analyze command:", error);
    return {
      success: false,
      message: `Failed to analyze repository: ${error.message}`,
    };
  }
}

/**
 * Handle create command
 * @param {Object} command - Parsed command
 * @returns {Promise<Object>} - Response
 */
async function handleCreateCommand(command) {
  try {
    const repoUrl = command.repo;
    if (!repoUrl) {
      return {
        success: false,
        message: "Please specify a repository name or URL.",
      };
    }

    // Check if NEAR contract is initialized
    if (!nearContract) {
      return {
        success: false,
        message: "NEAR contract not initialized. Please try again later.",
      };
    }

    // Check if split already exists
    try {
      const existingSplit = await nearContract.get_split_by_repo({
        repo_url: repoUrl,
      });

      if (existingSplit) {
        return {
          success: false,
          message: `A split already exists for ${repoUrl}. Use '@gitsplits splits ${repoUrl}' to see details.`,
        };
      }
    } catch (error) {
      console.error("Error checking if split exists:", error);
      // Continue with split creation even if check fails
    }

    // Parse GitHub URL
    const { owner, repo } = parseGitHubUrl(repoUrl);

    // Analyze contributions or use custom allocation
    let contributors;
    try {
      if (
        command.allocation &&
        command.allocation.toLowerCase() !== "default"
      ) {
        // Parse custom allocation
        const percentages = command.allocation.split("/").map((p) => p.trim());

        // Get contributors list first to get the GitHub usernames
        const repoContributors = await analyzeContributions(owner, repo);

        if (!repoContributors || repoContributors.length === 0) {
          return {
            success: false,
            message: `No contributors found for ${repoUrl}. Please check the repository URL.`,
          };
        }

        // Validate number of percentages matches number of contributors or is less
        if (percentages.length > repoContributors.length) {
          return {
            success: false,
            message: `Too many percentages specified. Repository has ${repoContributors.length} contributors but you specified ${percentages.length} percentages.`,
          };
        }

        // Calculate total percentage to ensure it adds up to 100
        const totalPercentage = percentages.reduce(
          (sum, p) => sum + Number(p),
          0
        );
        if (totalPercentage !== 100) {
          return {
            success: false,
            message: `Percentages must add up to 100%. Current total: ${totalPercentage}%`,
          };
        }

        // Create contributors with custom percentages
        contributors = [];
        for (let i = 0; i < percentages.length; i++) {
          const percentage = ((Number(percentages[i]) / 100) * 1e24).toString();
          contributors.push({
            github_username: repoContributors[i].github_username,
            account_id: null,
            percentage: percentage,
          });
        }

        console.log(
          `Using custom allocation for ${repoUrl}: ${command.allocation}`
        );
      } else {
        // Use default allocation based on contributions
        contributors = await analyzeContributions(owner, repo);
      }

      if (!contributors || contributors.length === 0) {
        return {
          success: false,
          message: `No contributors found for ${repoUrl}. Please check the repository URL.`,
        };
      }

      console.log(`Using ${contributors.length} contributors for ${repoUrl}`);
    } catch (error) {
      console.error("Error processing contributors:", error);
      return {
        success: false,
        message: `Failed to process contributors: ${error.message}`,
      };
    }

    // Create split on NEAR contract
    let splitId;
    try {
      console.log(
        `Creating split for ${repoUrl} with owner ${command.sender}...`
      );

      // Ensure owner is a valid NEAR account ID
      const owner = command.sender;

      splitId = await nearContract.create_split({
        repo_url: repoUrl,
        owner: owner,
      });

      console.log(`Split created with ID: ${splitId}`);
    } catch (error) {
      console.error("Error creating split on NEAR contract:", error);
      return {
        success: false,
        message: `Failed to create split on the blockchain: ${error.message}`,
      };
    }

    // Update split with contributors
    try {
      console.log(
        `Updating split ${splitId} with ${contributors.length} contributors...`
      );

      await nearContract.update_split({
        split_id: splitId,
        contributors: contributors,
      });

      console.log(`Split ${splitId} updated successfully`);
    } catch (error) {
      console.error("Error updating split with contributors:", error);
      return {
        success: false,
        message: `Split created but failed to add contributors: ${error.message}`,
      };
    }

    // Format contributors for display
    const contributorsDisplay = contributors
      .slice(0, 3) // Show only top 3 contributors
      .map((contributor) => {
        const percentage = (
          (Number(contributor.percentage) / 1e24) *
          100
        ).toFixed(1);
        return `- ${contributor.github_username}: ${percentage}%`;
      })
      .join("\n");

    const moreContributors =
      contributors.length > 3
        ? `\n...and ${contributors.length - 3} more contributors`
        : "";

    return {
      success: true,
      message:
        `✅ Split created for ${repoUrl}!\n\n` +
        `Split ID: ${splitId}\n` +
        `Contributors:\n${contributorsDisplay}${moreContributors}\n\n` +
        `To view this split:\n` +
        `@gitsplits split ${splitId}`,
    };
  } catch (error) {
    console.error("Error handling create command:", error);
    return {
      success: false,
      message: `Failed to create split: ${error.message}`,
    };
  }
}

/**
 * Handle splits command (view active splits for a repo)
 * @param {Object} command - Parsed command
 * @returns {Promise<Object>} - Response
 */
async function handleSplitsCommand(command) {
  try {
    const repoUrl = command.repo;
    if (!repoUrl) {
      return {
        success: false,
        message: "Please specify a repository name or URL.",
      };
    }

    // Check if NEAR contract is initialized
    if (!nearContract) {
      return {
        success: false,
        message: "NEAR contract not initialized. Please try again later.",
      };
    }

    // Get split information
    let split;
    try {
      split = await nearContract.get_split_by_repo({ repo_url: repoUrl });

      if (!split) {
        return {
          success: false,
          message: `No splits found for ${repoUrl}. Create one with '@gitsplits create split ${repoUrl} default'.`,
        };
      }
    } catch (error) {
      console.error("Error getting split from NEAR contract:", error);
      return {
        success: false,
        message: `Failed to get split information from the blockchain: ${error.message}`,
      };
    }

    // Format the response
    return {
      success: true,
      message:
        `📋 Splits for ${repoUrl}:\n\n` +
        `Split ID: ${split.id}\n` +
        `Created by: ${split.owner}\n` +
        `Contributors: ${
          split.contributors ? split.contributors.length : 0
        }\n` +
        `Created: ${new Date(
          Number(split.created_at) / 1000000
        ).toLocaleString()}\n\n` +
        `For more details:\n` +
        `@gitsplits split ${split.id}`,
    };
  } catch (error) {
    console.error("Error handling splits command:", error);
    return {
      success: false,
      message: `Failed to get splits: ${error.message}`,
    };
  }
}

/**
 * Handle split details command (view a specific split)
 * @param {Object} command - Parsed command
 * @returns {Promise<Object>} - Response
 */
async function handleSplitDetailsCommand(command) {
  try {
    const splitId = command.splitId;
    if (!splitId) {
      return {
        success: false,
        message: "Please specify a split ID.",
      };
    }

    // Check if NEAR contract is initialized
    if (!nearContract) {
      return {
        success: false,
        message: "NEAR contract not initialized. Please try again later.",
      };
    }

    // Get split information
    let split;
    try {
      split = await nearContract.get_split({ split_id: splitId });

      if (!split) {
        return {
          success: false,
          message: `No split found with ID ${splitId}.`,
        };
      }
    } catch (error) {
      console.error("Error getting split from NEAR contract:", error);
      return {
        success: false,
        message: `Failed to get split information from the blockchain: ${error.message}`,
      };
    }

    // Format contributors
    let contributorsInfo = "No contributors found";
    try {
      if (split.contributors && split.contributors.length > 0) {
        contributorsInfo = split.contributors
          .slice(0, 5) // Show only top 5 contributors
          .map((contributor) => {
            try {
              const percentage = (
                (Number(contributor.percentage) / 1e24) *
                100
              ).toFixed(1);
              return `- ${contributor.github_username}: ${percentage}%`;
            } catch (error) {
              console.error(
                `Error formatting contributor ${contributor.github_username}:`,
                error
              );
              return `- ${contributor.github_username}: Error calculating percentage`;
            }
          })
          .join("\n");

        if (split.contributors.length > 5) {
          contributorsInfo += `\n...and ${
            split.contributors.length - 5
          } more contributors`;
        }
      }
    } catch (error) {
      console.error("Error formatting contributors:", error);
      contributorsInfo = "Error formatting contributors";
    }

    return {
      success: true,
      message:
        `📊 Split Details:\n\n` +
        `Split ID: ${split.id}\n` +
        `Repository: ${split.repo_url}\n` +
        `Owner: ${split.owner}\n` +
        `Created: ${new Date(
          Number(split.created_at) / 1000000
        ).toLocaleString()}\n\n` +
        `Contributors:\n${contributorsInfo}\n\n` +
        `To pay contributors, use: @gitsplits pay <amount> <token> to ${split.repo_url}`,
    };
  } catch (error) {
    console.error("Error handling split details command:", error);
    return {
      success: false,
      message: `Failed to get split details: ${error.message}`,
    };
  }
}

/**
 * Handle distribute command
 * @param {Object} command - Parsed command
 * @returns {Promise<Object>} - Response
 */
async function handleDistributeCommand(command) {
  // This is a placeholder for the distribute command implementation
  // In a real implementation, this would handle the distribution of funds
  return {
    success: true,
    message:
      `💰 Distribution Request:\n\n` +
      `Amount: ${command.amount} ${command.token}\n` +
      `Repository: ${command.repo}\n\n` +
      `Fund distribution will be executed via NEAR Intents and Ping Pay.`,
  };
}

/**
 * Handle verify command
 * @param {Object} command - Parsed command
 * @returns {Promise<Object>} - Response
 */
async function handleVerifyCommand(command) {
  // This is a placeholder for the verify command implementation
  // In a real implementation, this would verify the GitHub identity
  return {
    success: true,
    message:
      `🔐 GitHub Verification:\n\n` +
      `To verify your GitHub identity (${command.github_username}), please visit:\n` +
      `https://gitsplits.xyz/verify\n\n` +
      `This will allow you to claim your portion of any splits you're included in.`,
  };
}

// Legacy info command handler removed

/**
 * Parse X (Twitter) message to extract command
 * @param {Object} message - X message object
 * @returns {Object} - Parsed command
 */
function parseXMessage(message) {
  try {
    // Extract text from message
    const text = message.text.toLowerCase();

    // Check if message is directed to GitSplits
    if (!text.includes("@gitsplits")) {
      return null;
    }

    // Remove mentions
    const cleanText = text
      .replace(/@gitsplits/g, "")
      .trim();

    // Parse repository analysis command (just the repo URL)
    // This is the simplest form: @gitsplits github.com/user/repo
    if (
      !cleanText.startsWith("create") &&
      !cleanText.startsWith("splits") &&
      !cleanText.startsWith("split") &&
      !cleanText.startsWith("help") &&
      !cleanText.startsWith("verify") &&
      !cleanText.startsWith("distribute")
    ) {
      // If it's just a repo URL or name, treat it as an analysis request
      return {
        action: "analyze",
        repo: cleanText.trim(),
        sender: message.author_id,
      };
    }

    // Parse create split command
    // Format: create split <repo> [allocation]
    if (cleanText.startsWith("create split")) {
      const createSplitText = cleanText.substring("create split".length).trim();

      // Check if there's a custom allocation
      const parts = createSplitText.split(/\s+(?=\d+\/|default$)/);

      if (parts.length >= 1) {
        const repo = parts[0].trim();
        const allocation = parts.length > 1 ? parts[1].trim() : "default";

        return {
          action: "create",
          repo,
          allocation,
          sender: message.author_id,
        };
      }
    }

    // Only support the new create split command format

    // Parse splits command (view active splits for a repo)
    if (cleanText.startsWith("splits")) {
      const repo = cleanText.substring("splits".length).trim();
      return {
        action: "splits",
        repo,
        sender: message.author_id,
      };
    }

    // Parse split command (view a specific split)
    if (cleanText.startsWith("split") && !cleanText.startsWith("splits")) {
      const splitId = cleanText.substring("split".length).trim();
      return {
        action: "split",
        splitId,
        sender: message.author_id,
      };
    }

    // Parse distribute command
    if (cleanText.startsWith("distribute")) {
      const parts = cleanText.match(/distribute\s+(\d+)\s+(\w+)\s+to\s+(.+)/i);
      if (parts) {
        return {
          action: "distribute",
          amount: parts[1],
          token: parts[2],
          repo: parts[3],
          sender: message.author_id,
        };
      }
    }

    // Parse verify command
    if (cleanText.startsWith("verify")) {
      const github_username = cleanText.substring("verify".length).trim();
      return {
        action: "verify",
        github_username,
        sender: message.author_id,
      };
    }

    // Legacy info command parsing removed

    // Parse help command
    if (cleanText.startsWith("help")) {
      return {
        action: "help",
        sender: message.author_id,
      };
    }

    // Natural language command parsing removed

    // Default to help if command is not recognized
    return { action: "help", sender: message.author_id };
  } catch (error) {
    console.error("Error parsing X message:", error);
    return { action: "help", sender: message.author_id };
  }
}

// API endpoints
app.post("/api/webhook/twitter", async (req, res) => {
  try {
    const message = req.body;

    // Parse X message
    const command = parseXMessage(message);
    if (!command) {
      return res.status(200).json({ message: "Not a GitSplits command" });
    }

    // Process command
    const response = await processXCommand(command);

    // Send response back to X
    try {
      if (twitterClient && message.id_str) {
        await twitterClient.reply(response.message, message.id_str);
      } else {
        console.log("Response to X:", response);
      }
    } catch (error) {
      console.error("Error replying to tweet:", error);
    }

    return res.status(200).json(response);
  } catch (error) {
    console.error("Error processing webhook:", error);
    return res.status(500).json({ error: error.message });
  }
});

app.get("/api/health", (req, res) => {
  const health = {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    connections: {
      near: !!nearConnection,
      github: !!githubClient,
      twitter: !!twitterClient,
    },
    environment: {
      node_env: process.env.NODE_ENV,
      near_network: process.env.NEAR_NETWORK_ID,
      near_contract: process.env.NEAR_CONTRACT_ID,
      twitter_screen_name: process.env.TWITTER_SCREEN_NAME,
    },
  };

  res.status(200).json(health);
});

// Endpoint to register the worker agent with the NEAR contract
app.post("/api/register", async (req, res) => {
  try {
    if (!nearContract) {
      return res.status(500).json({ error: "NEAR contract not initialized" });
    }

    // In a real TEE implementation, this would generate a real attestation quote
    // For now, we'll use a placeholder
    const attestation = {
      quote: "placeholder-quote",
      endorsements: "placeholder-endorsements",
    };

    // Register the worker with the NEAR contract
    const result = await nearContract.register_worker({
      _attestation: attestation,
      code_hash: "placeholder-code-hash",
    });

    return res.status(200).json({
      success: result,
      message: result
        ? "Worker registered successfully"
        : "Worker registration failed",
    });
  } catch (error) {
    console.error("Error registering worker:", error);
    return res.status(500).json({ error: error.message });
  }
});

// Endpoint to manually check for mentions
app.get("/api/check-mentions", async (req, res) => {
  try {
    // Check for mock mentions file (for testing)
    let mentions = [];
    if (process.env.MOCK_MENTIONS_FILE) {
      try {
        const fs = require("fs");
        const mockMentionData = fs.readFileSync(
          process.env.MOCK_MENTIONS_FILE,
          "utf8"
        );
        const mockMention = JSON.parse(mockMentionData);
        mentions = [mockMention];
        console.log(
          `Using mock mention from file: ${process.env.MOCK_MENTIONS_FILE}`
        );
      } catch (error) {
        console.error(`Error reading mock mentions file: ${error.message}`);
      }
    } else {
      // Normal Twitter API flow
      if (!twitterClient) {
        return res
          .status(500)
          .json({ error: "Twitter client not initialized" });
      }

      // Ensure Twitter client is authenticated
      await twitterClient.authenticate();

      // Get mentions since the last check
      const lastCheckTimestamp = process.env.TWITTER_LAST_TIMESTAMP || 0;
      mentions = await twitterClient.getMentions({
        since_id: lastCheckTimestamp,
      });
    }

    if (!mentions || mentions.length === 0) {
      return res.status(200).json({ message: "No new mentions" });
    }

    console.log(`Found ${mentions.length} new mentions`);

    // Process each mention
    const results = [];
    for (const mention of mentions) {
      // Update last timestamp
      if (
        !process.env.TWITTER_LAST_TIMESTAMP ||
        mention.id_str > process.env.TWITTER_LAST_TIMESTAMP
      ) {
        process.env.TWITTER_LAST_TIMESTAMP = mention.id_str;
      }

      // Parse and process the command
      const command = parseXMessage({
        text: mention.full_text || mention.text,
        author_id: mention.user.id_str,
        id_str: mention.id_str,
      });

      if (command) {
        console.log(`Processing command: ${JSON.stringify(command)}`);
        const response = await processXCommand(command);
        console.log(`Command response: ${JSON.stringify(response)}`);

        // Reply to the mention (skip if using mock mentions)
        if (!process.env.MOCK_MENTIONS_FILE && twitterClient) {
          try {
            await twitterClient.reply(response.message, mention.id_str);
            results.push({
              id: mention.id_str,
              command,
              response,
              replied: true,
            });
          } catch (error) {
            console.error("Error replying to mention:", error);
            results.push({
              id: mention.id_str,
              command,
              response,
              replied: false,
              error: error.message,
            });
          }
        } else {
          // For mock mentions, just log the response
          console.log(`Mock reply to ${mention.id_str}: ${response.message}`);
          results.push({
            id: mention.id_str,
            command,
            response,
            replied: true,
            mock: true,
          });
        }
      } else {
        console.log(
          `No valid command found in mention: ${
            mention.full_text || mention.text
          }`
        );
      }
    }

    return res.status(200).json({
      processed: results.length,
      results,
    });
  } catch (error) {
    console.error("Error checking mentions:", error);
    return res.status(500).json({ error: error.message });
  }
});

// Initialize connections and start server
const PORT = process.env.PORT || 3001;

/**
 * Check for new mentions and process them
 */
async function checkMentions() {
  try {
    // Skip automatic checking if using mock mentions
    if (process.env.MOCK_MENTIONS_FILE) {
      console.log("Skipping automatic mention check when using mock mentions");
      return;
    }

    if (!twitterClient) {
      console.error("Twitter client not initialized");
      return;
    }

    // Ensure Twitter client is authenticated
    await twitterClient.authenticate();

    // Get mentions since the last check
    const lastCheckTimestamp = process.env.TWITTER_LAST_TIMESTAMP || 0;
    const mentions = await twitterClient.getMentions({
      since_id: lastCheckTimestamp,
    });

    if (!mentions || mentions.length === 0) {
      console.log("No new mentions");
      return;
    }

    console.log(`Found ${mentions.length} new mentions`);

    // Process each mention
    for (const mention of mentions) {
      // Update last timestamp
      if (
        !process.env.TWITTER_LAST_TIMESTAMP ||
        mention.id_str > process.env.TWITTER_LAST_TIMESTAMP
      ) {
        process.env.TWITTER_LAST_TIMESTAMP = mention.id_str;
      }

      // Parse and process the command
      const command = parseXMessage({
        text: mention.full_text || mention.text,
        author_id: mention.user.id_str,
        id_str: mention.id_str,
      });

      if (command) {
        console.log(`Processing command: ${JSON.stringify(command)}`);
        const response = await processXCommand(command);
        console.log(`Command response: ${JSON.stringify(response)}`);

        // Reply to the mention
        try {
          await twitterClient.reply(response.message, mention.id_str);
          console.log(`Replied to mention ${mention.id_str}`);
        } catch (error) {
          console.error("Error replying to mention:", error);
        }
      } else {
        console.log(
          `No valid command found in mention: ${
            mention.full_text || mention.text
          }`
        );
      }
    }
  } catch (error) {
    console.error("Error checking mentions:", error);
  }
}

async function startServer() {
  const initialized = await initializeConnections();
  if (!initialized) {
    console.error("Failed to initialize connections. Exiting...");
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`GitSplits Worker Agent running on port ${PORT}`);

    // Set up periodic mention checking (every 2 minutes)
    setInterval(checkMentions, 2 * 60 * 1000);

    // Initial check for mentions
    checkMentions();
  });
}

startServer();
