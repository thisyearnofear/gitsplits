// Script to register a webhook with Neynar
require("dotenv").config();
const axios = require("axios");
const crypto = require("crypto");

// Neynar API configuration
// Format the API key correctly (remove dashes and convert to lowercase)
const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY
  ? process.env.NEYNAR_API_KEY.replace(/-/g, "").toLowerCase()
  : null;
const NEYNAR_API_URL = "https://api.neynar.com/v2";
const WEBHOOK_URL = process.env.FARCASTER_WEBHOOK_URL;
const SIGNER_UUID =
  process.env.NEYNAR_SIGNER_UUID || process.env.FARCASTER_SIGNER_UUID;

/**
 * Generate a random webhook secret
 * @returns {string} Random webhook secret
 */
function generateWebhookSecret() {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Register a webhook with Neynar
 * @returns {Promise<Object>} The registered webhook data
 */
async function registerWebhook() {
  try {
    console.log("Registering webhook with Neynar...");
    console.log("Configuration:");
    console.log(`- NEYNAR_API_KEY: ${NEYNAR_API_KEY ? "✓ Set" : "✗ Not set"}`);
    console.log(`- WEBHOOK_URL: ${WEBHOOK_URL || "✗ Not set"}`);
    console.log(`- SIGNER_UUID: ${SIGNER_UUID ? "✓ Set" : "✗ Not set"}`);

    // Check if API key and webhook URL are provided
    if (!NEYNAR_API_KEY) {
      throw new Error("NEYNAR_API_KEY is not set in environment variables");
    }

    if (!WEBHOOK_URL) {
      throw new Error(
        "FARCASTER_WEBHOOK_URL is not set in environment variables"
      );
    }

    if (!SIGNER_UUID) {
      throw new Error(
        "NEYNAR_SIGNER_UUID or FARCASTER_SIGNER_UUID is not set in environment variables"
      );
    }

    // Generate a webhook secret if not provided
    const webhookSecret =
      process.env.FARCASTER_WEBHOOK_SECRET || generateWebhookSecret();

    console.log("\nRegistering webhook with the following parameters:");
    console.log(`- URL: ${WEBHOOK_URL}`);
    console.log(`- Event Types: cast.created`);
    console.log(`- Secret: ${webhookSecret.substring(0, 8)}...`);

    // Make API request to register webhook
    // According to Neynar docs, the endpoint is /v2/farcaster/webhook
    const response = await axios.post(
      `${NEYNAR_API_URL}/farcaster/webhook`,
      {
        url: WEBHOOK_URL,
        event_types: ["cast.created"],
        secret: webhookSecret,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "api-key": NEYNAR_API_KEY,
        },
      }
    );

    console.log("\nWebhook registered successfully!");
    console.log("Webhook ID:", response.data.id);
    console.log("Webhook Secret:", webhookSecret);
    console.log("\nPlease save these values in your environment variables:");
    console.log(`FARCASTER_WEBHOOK_ID=${response.data.id}`);
    console.log(`FARCASTER_WEBHOOK_SECRET=${webhookSecret}`);

    return response.data;
  } catch (error) {
    console.error("\nError registering webhook:", error.message);
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error(
        "Response data:",
        JSON.stringify(error.response.data, null, 2)
      );
    }

    console.log("\nTroubleshooting tips:");
    console.log("1. Make sure your NEYNAR_API_KEY is correct");
    console.log("2. Make sure your WEBHOOK_URL is publicly accessible");
    console.log(
      "3. Make sure your WEBHOOK_URL includes the path (e.g., https://example.com/webhook)"
    );
    console.log(
      "4. Check the Neynar API documentation for any changes to the webhook registration endpoint"
    );

    throw error;
  }
}

// Run the script
registerWebhook()
  .then((data) => {
    console.log("Webhook registration completed.");
  })
  .catch((error) => {
    console.error("Webhook registration failed:", error.message);
    process.exit(1);
  });
