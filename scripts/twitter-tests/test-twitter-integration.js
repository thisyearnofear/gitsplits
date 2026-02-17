#!/usr/bin/env node
/**
 * Test script for the complete Twitter integration flow
 * 
 * This script tests the complete flow of searching for tweets and replying to them
 * 
 * Usage:
 * node scripts/twitter-tests/test-twitter-integration.js
 */

require('dotenv').config({ path: '.env.local' });

// Import the necessary functions
const { searchMasaTweets } = require("../../src/utils/social/masa");
const { crosspostReply, crosspostTweet } = require("../../src/utils/social/crosspost");

// Check if required environment variables are set
console.log("\n🔍 Checking environment variables...");

// Check for MASA_API_KEY
const masaApiKey = process.env.MASA_API_KEY;
if (!masaApiKey) {
  console.error("❌ Error: MASA_API_KEY environment variable is not set");
  process.exit(1);
}
console.log("✅ MASA_API_KEY: Set (hidden)");

// Check for CROSSPOST_SIGNER_ID
const crosspostSignerId = process.env.CROSSPOST_SIGNER_ID;
if (!crosspostSignerId) {
  console.error("❌ Error: CROSSPOST_SIGNER_ID environment variable is not set");
  process.exit(1);
}
console.log(`✅ CROSSPOST_SIGNER_ID: ${crosspostSignerId}`);

// Check for CROSSPOST_KEYPAIR
const crosspostKeypair = process.env.CROSSPOST_KEYPAIR;
if (!crosspostKeypair) {
  console.error("❌ Error: CROSSPOST_KEYPAIR environment variable is not set");
  process.exit(1);
}
console.log("✅ CROSSPOST_KEYPAIR: Set (hidden)");

// Check for BOT_TWITTER_USER_ID
const botTwitterUserId = process.env.BOT_TWITTER_USER_ID;
if (!botTwitterUserId) {
  console.error("❌ Error: BOT_TWITTER_USER_ID environment variable is not set");
  process.exit(1);
}
console.log(`✅ BOT_TWITTER_USER_ID: ${botTwitterUserId}`);

async function testTwitterIntegration() {
  try {
    console.log("\n🚀 Testing Twitter integration...");
    
    // Step 1: Post a test tweet
    console.log("\n--- Step 1: Posting a test tweet ---");
    const tweetText = `Test tweet from GitSplits at ${new Date().toISOString()}`;
    console.log(`Posting tweet: "${tweetText}"`);
    
    const postResult = await crosspostTweet(tweetText);
    console.log("✅ Tweet posted successfully!");
    console.log("Tweet ID:", postResult.data.id);
    
    // Step 2: Search for tweets mentioning GitSplits
    console.log("\n--- Step 2: Searching for tweets mentioning GitSplits ---");
    console.log("This may take a minute or two as Masa processes the job...");
    
    const tweets = await searchMasaTweets("GitSplits", { limit: 5 });
    console.log(`✅ Found ${tweets.length} tweets mentioning GitSplits`);
    
    if (tweets.length > 0) {
      // Display the first tweet
      const tweet = tweets[0];
      console.log("\nFirst tweet:");
      console.log(`ID: ${tweet.id_str}`);
      console.log(`User: ${tweet.user.screen_name}`);
      console.log(`Text: ${tweet.full_text}`);
      
      // Step 3: Reply to the first tweet
      console.log("\n--- Step 3: Replying to the first tweet ---");
      const replyText = `This is a test reply from GitSplits at ${new Date().toISOString()}`;
      console.log(`Replying with: "${replyText}"`);
      
      const replyResult = await crosspostReply(replyText, tweet);
      console.log("✅ Reply posted successfully!");
      console.log("Reply ID:", replyResult.data.id);
    } else {
      console.log("No tweets found to reply to.");
    }
    
    console.log("\n✅ Twitter integration test completed successfully");
  } catch (error) {
    console.error(`\n❌ Error testing Twitter integration: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run the test
testTwitterIntegration();
