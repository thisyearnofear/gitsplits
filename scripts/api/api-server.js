/**
 * API Server for GitSplits
 * 
 * This server provides API endpoints for the GitSplits application
 * It includes an endpoint to trigger processing of Twitter mentions
 * 
 * Usage:
 * node scripts/api/api-server.js
 */

require('dotenv').config({ path: '.env.local' });
const express = require('express');
const CrosspostClient = require('../near/crosspost-client');

// Create an Express app
const app = express();
const port = process.env.PORT || 3001;

// Get environment variables
const nearAccountId = process.env.CROSSPOST_SIGNER_ID;
const nearPrivateKey = process.env.CROSSPOST_KEYPAIR;
const botTwitterUserId = process.env.BOT_TWITTER_USER_ID;
const restartPass = process.env.RESTART_PASS || 'RESTART_PASS';

// Create a Crosspost client
const crosspost = new CrosspostClient({
  accountId: nearAccountId,
  privateKey: nearPrivateKey,
  botTwitterUserId: botTwitterUserId,
  debug: true
});

// Initialize the Crosspost client
async function initializeCrosspost() {
  try {
    await crosspost.initialize();
    console.log('Crosspost client initialized successfully');
  } catch (error) {
    console.error(`Error initializing Crosspost client: ${error.message}`);
  }
}

// Define the search endpoint to trigger processing
app.get('/api/search', async (req, res) => {
  const pass = req.query.pass;
  
  if (pass !== restartPass) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  console.log('Triggering processing...');
  
  try {
    // Example: Post a tweet to demonstrate functionality
    const tweetText = `GitSplits processing triggered at ${new Date().toISOString()}`;
    const result = await crosspost.postTweet(tweetText);
    
    return res.json({ 
      success: true, 
      message: 'Processing triggered', 
      tweet: {
        id: result.id_str,
        text: result.text
      }
    });
  } catch (error) {
    console.error(`Error triggering processing: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: {
      node_env: process.env.NODE_ENV,
      crosspost_signer_id: nearAccountId ? 'configured' : 'not configured',
      bot_twitter_user_id: botTwitterUserId ? 'configured' : 'not configured'
    }
  };
  
  res.status(200).json(health);
});

// Start the server
app.listen(port, async () => {
  console.log(`Server running on port ${port}`);
  
  // Initialize the Crosspost client
  await initializeCrosspost();
  
  console.log(`API endpoints:`);
  console.log(`- Health check: http://localhost:${port}/api/health`);
  console.log(`- Trigger processing: http://localhost:${port}/api/search?pass=${restartPass}`);
});
