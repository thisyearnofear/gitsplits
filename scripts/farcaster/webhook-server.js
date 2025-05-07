// Webhook server for Farcaster bot
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const crypto = require("crypto");
const axios = require("axios");

// Configuration
const PORT = process.env.FARCASTER_WEBHOOK_PORT || 3002;
// Format the API key correctly (remove dashes and convert to lowercase)
const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY
  ? process.env.NEYNAR_API_KEY.replace(/-/g, "").toLowerCase()
  : null;
const NEYNAR_API_URL = "https://api.neynar.com/v2";
const SIGNER_UUID =
  process.env.NEYNAR_SIGNER_UUID || process.env.FARCASTER_SIGNER_UUID;
const WEBHOOK_SECRET = process.env.FARCASTER_WEBHOOK_SECRET;

// Initialize Express app
const app = express();
app.use(bodyParser.json());

/**
 * Verify webhook signature
 * @param {Object} req - Express request object
 * @returns {boolean} Whether the signature is valid
 */
function verifyWebhookSignature(req) {
  if (!WEBHOOK_SECRET) {
    console.warn("WEBHOOK_SECRET not set, skipping signature verification");
    return true;
  }

  const signature = req.headers["x-neynar-signature"];
  if (!signature) {
    console.error("No signature found in request headers");
    return false;
  }

  const payload = JSON.stringify(req.body);
  const hmac = crypto.createHmac("sha256", WEBHOOK_SECRET);
  const digest = hmac.update(payload).digest("hex");

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

/**
 * Parse command from cast text
 * @param {string} text - Cast text
 * @returns {Object} Parsed command
 */
function parseCommand(text) {
  // Remove the bot mention
  const commandText = text.replace(/@gitsplits/i, "").trim();

  // Parse the command
  if (commandText.startsWith("create split")) {
    const parts = commandText.replace("create split", "").trim().split(" ");
    const repo = parts[0];
    const allocation = parts.length > 1 ? parts[1] : "default";
    return { action: "create", repo, allocation };
  } else if (commandText.startsWith("splits")) {
    const repo = commandText.replace("splits", "").trim();
    return { action: "splits", repo };
  } else if (commandText.startsWith("help")) {
    return { action: "help" };
  } else {
    // Default to analyze command
    return { action: "analyze", repo: commandText };
  }
}

/**
 * Handle analyze command
 * @param {Object} command - Parsed command
 * @param {Object} cast - Cast data
 * @returns {Promise<string>} Response text
 */
async function handleAnalyzeCommand(command, cast) {
  try {
    // This is a placeholder. In a real implementation, you would call your
    // GitHub analysis code here.
    console.log(`Analyzing repository: ${command.repo}`);

    // Simulate a delay for analysis
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return (
      `Analysis of ${command.repo}:\n\n` +
      `- Contributor 1: 50%\n` +
      `- Contributor 2: 30%\n` +
      `- Contributor 3: 20%\n\n` +
      `To create a split with these percentages, reply with:\n` +
      `@gitsplits create split ${command.repo} default`
    );
  } catch (error) {
    console.error("Error analyzing repository:", error);
    return `Error analyzing repository ${command.repo}: ${error.message}`;
  }
}

/**
 * Handle create command
 * @param {Object} command - Parsed command
 * @param {Object} cast - Cast data
 * @returns {Promise<string>} Response text
 */
async function handleCreateCommand(command, cast) {
  try {
    // This is a placeholder. In a real implementation, you would call your
    // smart contract code here.
    console.log(
      `Creating split for repository: ${command.repo} with allocation: ${command.allocation}`
    );

    // Simulate a delay for split creation
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return (
      `Split created for ${command.repo} with ${command.allocation} allocation!\n\n` +
      `Split contract address: 0x1234...5678\n\n` +
      `Contributors can now receive funds through this split.`
    );
  } catch (error) {
    console.error("Error creating split:", error);
    return `Error creating split for ${command.repo}: ${error.message}`;
  }
}

/**
 * Handle splits command
 * @param {Object} command - Parsed command
 * @param {Object} cast - Cast data
 * @returns {Promise<string>} Response text
 */
async function handleSplitsCommand(command, cast) {
  try {
    // This is a placeholder. In a real implementation, you would call your
    // smart contract code here.
    console.log(`Getting splits for repository: ${command.repo}`);

    // Simulate a delay for getting splits
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return (
      `Splits for ${command.repo}:\n\n` +
      `- Split 1: 0x1234...5678 (50/30/20)\n` +
      `- Split 2: 0x8765...4321 (40/40/20)`
    );
  } catch (error) {
    console.error("Error getting splits:", error);
    return `Error getting splits for ${command.repo}: ${error.message}`;
  }
}

/**
 * Handle help command
 * @returns {Promise<string>} Response text
 */
async function handleHelpCommand() {
  return (
    `GitSplits Bot Commands:\n\n` +
    `- @gitsplits <repo>: Analyze repository contributions\n` +
    `- @gitsplits create split <repo> [allocation]: Create a split for a repository\n` +
    `- @gitsplits splits <repo>: View active splits for a repository\n` +
    `- @gitsplits help: Show this help message`
  );
}

/**
 * Process command and generate response
 * @param {Object} command - Parsed command
 * @param {Object} cast - Cast data
 * @returns {Promise<string>} Response text
 */
async function processCommand(command, cast) {
  console.log("Processing command:", command);

  switch (command.action) {
    case "analyze":
      return await handleAnalyzeCommand(command, cast);
    case "create":
      return await handleCreateCommand(command, cast);
    case "splits":
      return await handleSplitsCommand(command, cast);
    case "help":
      return await handleHelpCommand();
    default:
      return `Unknown command. Type @gitsplits help for available commands.`;
  }
}

/**
 * Reply to a cast
 * @param {string} text - Reply text
 * @param {string} parentHash - Parent cast hash
 * @returns {Promise<Object>} Reply data
 */
async function replyCast(text, parentHash) {
  try {
    console.log(`Replying to cast ${parentHash} with text: ${text}`);

    // Check if API key and signer UUID are provided
    if (!NEYNAR_API_KEY || !SIGNER_UUID) {
      throw new Error(
        "NEYNAR_API_KEY or SIGNER_UUID not set in environment variables"
      );
    }

    // Make API request to reply to cast
    const response = await axios.post(
      `${NEYNAR_API_URL}/farcaster/cast`,
      {
        signer_uuid: SIGNER_UUID,
        text: text,
        parent: parentHash,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "api-key": NEYNAR_API_KEY,
        },
      }
    );

    console.log("Reply posted successfully!");
    return response.data;
  } catch (error) {
    console.error("Error replying to cast:", error.message);
    if (error.response) {
      console.error("Response data:", error.response.data);
    }
    throw error;
  }
}

// Webhook endpoint
app.post("/webhook", async (req, res) => {
  try {
    // Verify webhook signature
    if (!verifyWebhookSignature(req)) {
      console.error("Invalid webhook signature");
      return res.status(401).json({ error: "Invalid signature" });
    }

    const event = req.body;
    console.log("Received webhook event:", JSON.stringify(event, null, 2));

    // Check if this is a cast.created event
    if (event.type === "cast.created") {
      const cast = event.data;

      // Check if the cast mentions @gitsplits
      const mentionsBot = cast.text.includes("@gitsplits");
      if (mentionsBot) {
        console.log("Bot mentioned in cast:", cast.text);

        // Parse the command
        const command = parseCommand(cast.text);

        // Process the command and generate a response
        const responseText = await processCommand(command, cast);

        // Reply to the cast
        await replyCast(responseText, cast.hash);
      }
    }

    // Acknowledge receipt of the webhook
    res.status(200).json({ status: "ok" });
  } catch (error) {
    console.error("Error processing webhook:", error);
    res.status(500).json({ error: error.message });
  }
});

// Add a health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    config: {
      port: PORT,
      apiUrl: NEYNAR_API_URL,
      hasApiKey: !!NEYNAR_API_KEY,
      hasSignerUuid: !!SIGNER_UUID,
      hasWebhookSecret: !!WEBHOOK_SECRET,
    },
  });
});

// Add a test endpoint
app.get("/test", async (req, res) => {
  try {
    // Check if we can authenticate with Neynar
    if (!NEYNAR_API_KEY) {
      return res.status(500).json({ error: "NEYNAR_API_KEY is not set" });
    }

    if (!SIGNER_UUID) {
      return res.status(500).json({ error: "SIGNER_UUID is not set" });
    }

    // Try to get the bot's profile
    const response = await axios.get(
      `${NEYNAR_API_URL}/farcaster/user?fid=${
        process.env.NEYNAR_APP_FID || "me"
      }`,
      {
        headers: {
          "Content-Type": "application/json",
          "api-key": NEYNAR_API_KEY,
        },
      }
    );

    return res.status(200).json({
      status: "ok",
      message: "Successfully connected to Neynar API",
      user: response.data,
    });
  } catch (error) {
    console.error("Error testing Neynar API:", error.message);
    if (error.response) {
      console.error("Response data:", error.response.data);
    }
    return res
      .status(500)
      .json({ error: error.message, details: error.response?.data });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Farcaster webhook server listening on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Test endpoint: http://localhost:${PORT}/test`);
  console.log(`Webhook endpoint: http://localhost:${PORT}/webhook`);

  // Log configuration
  console.log("\nConfiguration:");
  console.log(`- NEYNAR_API_KEY: ${NEYNAR_API_KEY ? "✓ Set" : "✗ Not set"}`);
  console.log(`- SIGNER_UUID: ${SIGNER_UUID ? "✓ Set" : "✗ Not set"}`);
  console.log(`- WEBHOOK_SECRET: ${WEBHOOK_SECRET ? "✓ Set" : "✗ Not set"}`);
});
