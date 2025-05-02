// Script to simulate Twitter mentions for testing
const axios = require('axios');
const crypto = require('crypto');

// Base URL for the worker agent
const BASE_URL = process.env.WORKER_URL || 'http://localhost:3001';

/**
 * Generate a random Twitter ID
 * @returns {string} Random Twitter ID
 */
function generateRandomTwitterId() {
  // Twitter IDs are typically 19 digits
  return Math.floor(1000000000000000000 + Math.random() * 9000000000000000000).toString();
}

/**
 * Simulate a Twitter mention
 * @param {string} command - The command to send
 * @param {string} username - The Twitter username
 * @returns {Promise<Object>} Response from the worker agent
 */
async function simulateMention(command, username = 'test_user') {
  try {
    // Create a mock Twitter mention
    const tweetId = generateRandomTwitterId();
    const mockMention = {
      id_str: tweetId,
      created_at: new Date().toISOString(),
      full_text: `@bankrbot @gitsplits ${command}`,
      user: {
        id_str: generateRandomTwitterId(),
        screen_name: username,
        name: 'Test User',
      },
    };

    // Create a webhook payload
    const webhookPayload = {
      for_user_id: process.env.TWITTER_USER_ID || '1234567890',
      tweet_create_events: [mockMention],
    };

    // Send the webhook payload to the worker agent
    console.log(`Simulating mention: "${mockMention.full_text}" from @${username}`);
    
    // Option 1: Use the webhook endpoint (if implemented)
    // const response = await axios.post(`${BASE_URL}/api/webhook`, webhookPayload);
    
    // Option 2: Directly call the check-mentions endpoint and then process the command
    // First, store the mention in a temporary file
    const fs = require('fs');
    const tempDir = './tmp';
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }
    
    const tempFile = `${tempDir}/mock-mention-${Date.now()}.json`;
    fs.writeFileSync(tempFile, JSON.stringify(mockMention));
    
    // Set the environment variable to point to this file
    process.env.MOCK_MENTIONS_FILE = tempFile;
    
    // Call the check-mentions endpoint
    const response = await axios.get(`${BASE_URL}/api/check-mentions`);
    
    // Clean up the temporary file
    fs.unlinkSync(tempFile);
    
    return response.data;
  } catch (error) {
    console.error('Error simulating mention:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

/**
 * Main function to run the tests
 */
async function runTests() {
  try {
    // Test commands
    const commands = [
      'help',
      'create near/near-sdk-rs',
      'info near/near-sdk-rs',
      'verify papajams',
      'distribute 5 NEAR to near/near-sdk-rs',
    ];
    
    // Run each command
    for (const command of commands) {
      console.log(`\n=== Testing command: ${command} ===`);
      const response = await simulateMention(command);
      console.log('Response:', JSON.stringify(response, null, 2));
      
      // Wait a bit between commands
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('\nAll tests completed');
  } catch (error) {
    console.error('Error running tests:', error.message);
  }
}

// Check if this script is being run directly
if (require.main === module) {
  // Get command from command line arguments
  const args = process.argv.slice(2);
  const command = args.join(' ');
  
  if (command) {
    // Run a single command
    simulateMention(command)
      .then(response => {
        console.log('Response:', JSON.stringify(response, null, 2));
      })
      .catch(error => {
        console.error('Error:', error.message);
      });
  } else {
    // Run all test commands
    runTests();
  }
}

module.exports = { simulateMention };
