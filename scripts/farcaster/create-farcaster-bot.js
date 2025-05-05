// Script to create a Farcaster bot using the Neynar API
require('dotenv').config();
const axios = require('axios');

// Neynar API configuration
const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
const NEYNAR_API_URL = 'https://api.neynar.com/v2';

/**
 * Create a new Farcaster bot
 * @returns {Promise<Object>} The created bot data
 */
async function createFarcasterBot() {
  try {
    console.log('Creating Farcaster bot...');
    
    // Check if API key is provided
    if (!NEYNAR_API_KEY) {
      throw new Error('NEYNAR_API_KEY is not set in environment variables');
    }
    
    // Make API request to create a new bot
    // Note: This is a placeholder. The actual API endpoint may differ.
    // Refer to Neynar documentation for the correct endpoint.
    const response = await axios.post(
      `${NEYNAR_API_URL}/farcaster/signer`,
      {
        app_fid: process.env.NEYNAR_APP_FID,
        deadline: Math.floor(Date.now() / 1000) + 86400, // 24 hours from now
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'api-key': NEYNAR_API_KEY,
        },
      }
    );
    
    console.log('Farcaster bot created successfully!');
    console.log('Signer UUID:', response.data.signer_uuid);
    console.log('Please save this UUID for future use.');
    
    return response.data;
  } catch (error) {
    console.error('Error creating Farcaster bot:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

// Run the script
createFarcasterBot()
  .then((data) => {
    console.log('Bot creation completed.');
  })
  .catch((error) => {
    console.error('Bot creation failed:', error.message);
    process.exit(1);
  });
