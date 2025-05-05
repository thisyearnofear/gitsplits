// Test script for Twitter Cookie Auth
const axios = require("axios");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

// Check if Twitter credentials are set
if (!process.env.TWITTER_AUTH_TOKEN || !process.env.TWITTER_CT0) {
  console.error(
    "Error: Twitter credentials are not defined in environment variables"
  );
  process.exit(1);
}

console.log("Twitter credentials found in environment variables");
console.log(`Auth Token: ${process.env.TWITTER_AUTH_TOKEN.substring(0, 5)}...`);
console.log(`CT0: ${process.env.TWITTER_CT0.substring(0, 5)}...`);

// Function to get Twitter headers
function getTwitterHeaders() {
  return {
    Authorization: `Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA`,
    Cookie: `auth_token=${process.env.TWITTER_AUTH_TOKEN}; ct0=${process.env.TWITTER_CT0}`,
    "X-Csrf-Token": process.env.TWITTER_CT0,
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  };
}

// Test getting mentions
async function testGetMentions() {
  try {
    console.log("Testing getting mentions...");

    const url = "https://api.twitter.com/1.1/statuses/mentions_timeline.json";
    const params = new URLSearchParams({
      count: 5,
      tweet_mode: "extended",
    }).toString();

    const response = await axios.get(`${url}?${params}`, {
      headers: getTwitterHeaders(),
    });

    if (Array.isArray(response.data)) {
      console.log(`Found ${response.data.length} mentions:`);
      response.data.forEach((mention, index) => {
        console.log(
          `${index + 1}. @${mention.user.screen_name}: ${mention.full_text}`
        );
      });
    } else {
      console.log("Response data is not an array. Raw response:");
      console.log(JSON.stringify(response.data, null, 2));
    }

    console.log("\nTwitter Cookie Auth is working correctly!");
    return true;
  } catch (error) {
    console.error("Error testing Twitter Cookie Auth:", error.message);

    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error(
        "Response data:",
        JSON.stringify(error.response.data, null, 2)
      );
    }

    return false;
  }
}

// Run the test
testGetMentions();
