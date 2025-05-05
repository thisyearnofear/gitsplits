#!/bin/bash

# Script to test different Twitter API endpoints with cookie authentication

# Navigate to the worker directory
cd worker

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Create a temporary test script
cat > test-twitter-endpoints.js << 'EOL'
// Script to test different Twitter API endpoints
const axios = require('axios');
require('dotenv').config();

// Get cookie values from environment variables
const authToken = process.env.TWITTER_COOKIES_AUTH_TOKEN;
const ct0 = process.env.TWITTER_COOKIES_CT0;
const guestId = process.env.TWITTER_COOKIES_GUEST_ID;
const screenName = process.env.TWITTER_SCREEN_NAME || 'gitsplits';

// Check if we have the required cookies
if (!authToken || !ct0) {
  console.error('Error: Missing required cookie values');
  console.error('Make sure TWITTER_COOKIES_AUTH_TOKEN and TWITTER_COOKIES_CT0 are set in your .env file');
  process.exit(1);
}

// Function to get headers for Twitter API requests
function getHeaders() {
  const cookies = [
    `auth_token=${authToken}; Domain=.twitter.com; Path=/; Secure; SameSite=Lax`,
    `ct0=${ct0}; Domain=.twitter.com; Path=/; Secure; SameSite=Lax`
  ];

  if (guestId) {
    cookies.push(`guest_id=${guestId}; Domain=.twitter.com; Path=/; Secure; SameSite=Lax`);
  }

  return {
    Authorization: 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs=1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA',
    Cookie: cookies.join('; '),
    'X-Csrf-Token': ct0,
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  };
}

// Function to test an endpoint
async function testEndpoint(url) {
  console.log(`Testing endpoint: ${url}`);
  try {
    const response = await axios.get(url, { headers: getHeaders() });
    console.log(`✅ Success! Status: ${response.status}`);
    return true;
  } catch (error) {
    console.log(`❌ Failed! Status: ${error.response?.status || 'Unknown'}`);
    console.log(`Error: ${error.message}`);
    if (error.response?.data) {
      console.log('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

// Main function to test all endpoints
async function testAllEndpoints() {
  console.log('Testing Twitter API endpoints with cookie authentication...');
  console.log(`Using auth_token: ${authToken.substring(0, 5)}...`);
  console.log(`Using ct0: ${ct0.substring(0, 5)}...`);
  if (guestId) {
    console.log(`Using guest_id: ${guestId.substring(0, 5)}...`);
  }
  console.log('');

  // Define endpoints to test
  const v1Endpoints = [
    `https://api.twitter.com/1.1/account/verify_credentials.json`,
    `https://api.twitter.com/1.1/users/show.json?screen_name=${screenName}`,
    `https://api.twitter.com/1.1/statuses/home_timeline.json?count=1`,
    `https://api.twitter.com/1.1/statuses/mentions_timeline.json?count=1`,
    `https://api.twitter.com/1.1/search/tweets.json?q=%40${screenName}&count=1`
  ];

  const v2Endpoints = [
    `https://api.twitter.com/2/users/by/username/${screenName}`,
    `https://api.twitter.com/2/tweets/search/recent?query=%40${screenName}`
  ];

  // Test v1 endpoints
  console.log('Testing v1.1 API endpoints:');
  let v1Success = false;
  for (const endpoint of v1Endpoints) {
    const success = await testEndpoint(endpoint);
    if (success) {
      v1Success = true;
    }
    console.log('');
  }

  // Test v2 endpoints
  console.log('Testing v2 API endpoints:');
  let v2Success = false;
  for (const endpoint of v2Endpoints) {
    const success = await testEndpoint(endpoint);
    if (success) {
      v2Success = true;
    }
    console.log('');
  }

  // Summary
  console.log('Summary:');
  console.log(`v1.1 API: ${v1Success ? '✅ Working' : '❌ Not working'}`);
  console.log(`v2 API: ${v2Success ? '✅ Working' : '❌ Not working'}`);
  
  if (!v1Success && !v2Success) {
    console.log('');
    console.log('All endpoints failed. Possible issues:');
    console.log('1. Your cookie values may be expired. Try getting fresh cookies from your browser.');
    console.log('2. Your Twitter account may not have API access. Try using a different account.');
    console.log('3. Twitter may be rate limiting your requests. Try again later.');
  }
}

// Run the tests
testAllEndpoints();
EOL

# Run the test script
echo "Testing Twitter API endpoints..."
node test-twitter-endpoints.js

# Clean up
rm test-twitter-endpoints.js
