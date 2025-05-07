#!/usr/bin/env node
/**
 * Test script for Masa API integration
 * 
 * This script tests the Masa API integration for searching tweets
 * 
 * Usage:
 * node scripts/twitter-tests/test-masa-api.js
 */

require('dotenv').config({ path: '.env.local' });
const MasaAPI = require('../twitter-integration/masa-api');

// Check if required environment variables are set
console.log("\n🔍 Checking environment variables...");

// Check for MASA_API_KEY
const masaApiKey = process.env.MASA_API_KEY;
if (!masaApiKey) {
  console.error("❌ Error: MASA_API_KEY environment variable is not set");
  console.log("Please set MASA_API_KEY in your .env.local file");
  console.log("You can get a free API key from https://data.dev.masalabs.ai/dashboard");
  process.exit(1);
}
console.log("✅ MASA_API_KEY: Set (hidden)");

async function testMasaApi() {
  try {
    console.log("\n🚀 Testing Masa API integration...");
    
    // Create a Masa API client
    const masaClient = new MasaAPI({
      debug: true
    });
    
    // Define the search query
    const searchQuery = 'GitSplits';
    console.log(`\n--- Searching for tweets mentioning: "${searchQuery}" ---`);
    
    // Search for tweets
    console.log("This may take a minute or two as Masa processes the job...");
    const tweets = await masaClient.searchMentions(searchQuery, { limit: 10 });
    
    // Display the results
    console.log(`\n✅ Found ${tweets.length} tweets mentioning ${searchQuery}`);
    
    if (tweets.length > 0) {
      console.log("\nHere are the first few tweets:");
      const displayCount = Math.min(tweets.length, 3);
      
      for (let i = 0; i < displayCount; i++) {
        const tweet = tweets[i];
        console.log(`\n--- Tweet ${i + 1} ---`);
        console.log(`ID: ${tweet.id_str}`);
        console.log(`User: ${tweet.user.screen_name}`);
        console.log(`Created at: ${tweet.created_at}`);
        console.log(`Text: ${tweet.full_text}`);
      }
    }
    
    console.log("\n✅ Masa API integration test completed successfully");
  } catch (error) {
    console.error(`\n❌ Error testing Masa API integration: ${error.message}`);
    
    if (error.stack) {
      console.error(error.stack);
    }
    
    console.log("\nTroubleshooting tips:");
    console.log("1. Make sure your MASA_API_KEY is correct");
    console.log("2. Check if the Masa API service is available");
    console.log("3. Try a different search query");
    
    process.exit(1);
  }
}

// Run the test
testMasaApi();
