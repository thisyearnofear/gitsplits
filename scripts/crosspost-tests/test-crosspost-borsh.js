#!/usr/bin/env node
/**
 * Test script for Crosspost integration using borsh serialization
 *
 * This script tests the Crosspost integration using the approach from the shade-agent-basednames repo
 *
 * Usage:
 * node scripts/test-crosspost-borsh.js
 */

require("dotenv").config({ path: ".env.local" });
const { CrosspostClient } = require("@crosspost/sdk");
const { Platform } = require("@crosspost/types");
const { sha256 } = require("@noble/hashes/sha2");
const borsh = require("borsh");
const nearAPI = require("near-api-js");
const { generateNonce, uint8ArrayToBase64 } = require("near-sign-verify");

// Check if required environment variables are set
console.log("\n🔍 Checking environment variables...");

// Check for CROSSPOST_SIGNER_ID
const crosspostSignerId = process.env.CROSSPOST_SIGNER_ID;
if (!crosspostSignerId) {
  console.error(
    "❌ Error: CROSSPOST_SIGNER_ID environment variable is not set"
  );
  console.log("Please set CROSSPOST_SIGNER_ID in your .env.local file");
  console.log(
    "This should be your NEAR account ID that you used to login to opencrosspost.com"
  );
  process.exit(1);
}
console.log(`✅ CROSSPOST_SIGNER_ID: ${crosspostSignerId}`);

// Check for CROSSPOST_KEYPAIR
const crosspostKeypair = process.env.CROSSPOST_KEYPAIR;
if (!crosspostKeypair) {
  console.error("❌ Error: CROSSPOST_KEYPAIR environment variable is not set");
  console.log("Please set CROSSPOST_KEYPAIR in your .env.local file");
  console.log(
    "This should be the SECRET KEYPAIR generated using near-cli-rs with the command:"
  );
  console.log(
    `near account add-key ${crosspostSignerId} grant-function-call-access --allowance '0 NEAR' --contract-account-id crosspost.near --function-names '' autogenerate-new-keypair print-to-terminal network-config mainnet sign-with-keychain send`
  );
  process.exit(1);
}
console.log("✅ CROSSPOST_KEYPAIR: Set (hidden)");

// Check for BOT_TWITTER_USER_ID
const botTwitterUserId = process.env.BOT_TWITTER_USER_ID;
if (!botTwitterUserId) {
  console.error(
    "❌ Error: BOT_TWITTER_USER_ID environment variable is not set"
  );
  console.log("Please set BOT_TWITTER_USER_ID in your .env.local file");
  console.log(
    "This should be the Twitter user ID that you copied from opencrosspost.com after connecting your Twitter account"
  );
  process.exit(1);
}
console.log(`✅ BOT_TWITTER_USER_ID: ${botTwitterUserId}`);

async function testCrosspostBorsh() {
  try {
    console.log(
      "\n🚀 Testing Crosspost integration with borsh serialization..."
    );

    // Create authentication data
    console.log("\n--- Creating authentication data ---");
    const message = "Post";
    const nonce = generateNonce();
    const recipient = "crosspost.near";

    // Create the signer from the keypair
    const signer = nearAPI.KeyPair.fromString(crosspostKeypair);

    // Create the payload
    const TAG = 2147484061; // Magic number for verification

    const payload = {
      tag: TAG,
      message,
      nonce: Array.from(nonce),
      receiver: recipient,
      callback_url: null,
    };

    // Define the schema for borsh serialization
    const schema = {
      struct: {
        tag: "u32",
        message: "string",
        nonce: { array: { type: "u8", len: 32 } },
        receiver: "string",
        callback_url: { option: "string" },
      },
    };

    // Serialize the payload
    const serializedPayload = borsh.serialize(schema, payload);

    // Hash the payload
    const payloadHash = sha256(serializedPayload);

    // Sign the hash
    const signedMessage = signer.sign(payloadHash);

    // Create the authentication data
    const authData = {
      message,
      nonce: nonce,
      recipient,
      callback_url: "",
      signature: uint8ArrayToBase64(signedMessage.signature),
      account_id: crosspostSignerId,
      public_key: signedMessage.publicKey.toString(),
    };

    console.log("Authentication data created");

    // Initialize the Crosspost client
    console.log("\n--- Initializing Crosspost client ---");
    const client = new CrosspostClient();
    console.log("✅ Client initialized");

    // Set the authentication
    console.log("Setting authentication...");
    await client.setAuthentication(authData);
    console.log("✅ Authentication set");

    // Test posting a tweet
    console.log("\n--- Testing tweet posting ---");
    const tweetText = `Test tweet from GitSplits using Crosspost at ${new Date().toISOString()}`;
    console.log(`Posting tweet: "${tweetText}"`);
    console.log("This may take a moment...");

    // Prepare the request payload
    const postRequest = {
      targets: [
        {
          platform: Platform.TWITTER,
          userId: botTwitterUserId,
        },
      ],
      content: [
        {
          text: tweetText,
        },
      ],
      account_id: crosspostSignerId,
    };

    console.log("Request payload:", JSON.stringify(postRequest, null, 2));

    // Post the tweet
    const result = await client.post.createPost(postRequest);

    console.log("✅ Tweet posted successfully!");
    console.log("Result:", JSON.stringify(result, null, 2));

    console.log("\n✅ Crosspost integration test completed successfully");
  } catch (error) {
    console.error(`\n❌ Error testing Crosspost integration: ${error.message}`);

    if (error.details) {
      console.error("Error details:", JSON.stringify(error.details, null, 2));
    }

    if (error.stack) {
      console.error(error.stack);
    }

    console.log("\nTroubleshooting tips:");
    console.log(
      "1. Make sure you have connected your Twitter account to your NEAR account at opencrosspost.com"
    );
    console.log(
      "2. Make sure your CROSSPOST_KEYPAIR is correct and has function call access to the crosspost.near contract"
    );
    console.log("3. Make sure your BOT_TWITTER_USER_ID is correct");
    console.log("4. Make sure your NEAR account has sufficient balance");
    console.log(
      "5. Try visiting opencrosspost.com and manually posting to verify your account connection"
    );

    process.exit(1);
  }
}

// Run the test
testCrosspostBorsh();
