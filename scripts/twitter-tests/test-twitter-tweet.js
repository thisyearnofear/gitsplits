// Test script for sending a tweet using Twitter Cookie Auth
const axios = require('axios');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Check if Twitter credentials are set
if (!process.env.TWITTER_AUTH_TOKEN || !process.env.TWITTER_CT0) {
  console.error("Error: Twitter credentials are not defined in environment variables");
  process.exit(1);
}

console.log("Twitter credentials found in environment variables");
console.log(`Auth Token: ${process.env.TWITTER_AUTH_TOKEN.substring(0, 5)}...`);
console.log(`CT0: ${process.env.TWITTER_CT0.substring(0, 5)}...`);

// Function to get Twitter headers
function getTwitterHeaders() {
  return {
    'Authorization': `Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA`,
    'Cookie': `auth_token=${process.env.TWITTER_AUTH_TOKEN}; ct0=${process.env.TWITTER_CT0}`,
    'X-Csrf-Token': process.env.TWITTER_CT0,
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  };
}

// Test sending a tweet
async function testSendTweet() {
  try {
    console.log("Testing sending a tweet...");
    
    const url = 'https://api.twitter.com/1.1/statuses/update.json';
    const timestamp = new Date().toISOString();
    const tweetText = `Test tweet from GitSplits worker agent at ${timestamp}`;
    
    console.log(`Tweet text: "${tweetText}"`);
    
    const response = await axios.post(
      url, 
      { status: tweetText },
      { headers: getTwitterHeaders() }
    );
    
    console.log("Tweet sent successfully!");
    console.log("Tweet ID:", response.data.id_str);
    console.log("Tweet URL:", `https://twitter.com/${response.data.user.screen_name}/status/${response.data.id_str}`);
    
    return true;
  } catch (error) {
    console.error("Error sending tweet:", error.message);
    
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", JSON.stringify(error.response.data, null, 2));
    }
    
    return false;
  }
}

// Run the test
testSendTweet();
