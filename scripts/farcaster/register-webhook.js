// Script to register a webhook with Neynar
require('dotenv').config();
const axios = require('axios');
const crypto = require('crypto');

// Neynar API configuration
const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
const NEYNAR_API_URL = 'https://api.neynar.com/v2';
const WEBHOOK_URL = process.env.FARCASTER_WEBHOOK_URL;

/**
 * Generate a random webhook secret
 * @returns {string} Random webhook secret
 */
function generateWebhookSecret() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Register a webhook with Neynar
 * @returns {Promise<Object>} The registered webhook data
 */
async function registerWebhook() {
  try {
    console.log('Registering webhook with Neynar...');
    
    // Check if API key and webhook URL are provided
    if (!NEYNAR_API_KEY) {
      throw new Error('NEYNAR_API_KEY is not set in environment variables');
    }
    
    if (!WEBHOOK_URL) {
      throw new Error('FARCASTER_WEBHOOK_URL is not set in environment variables');
    }
    
    // Generate a webhook secret if not provided
    const webhookSecret = process.env.FARCASTER_WEBHOOK_SECRET || generateWebhookSecret();
    
    // Make API request to register webhook
    // Note: This is a placeholder. The actual API endpoint may differ.
    // Refer to Neynar documentation for the correct endpoint.
    const response = await axios.post(
      `${NEYNAR_API_URL}/farcaster/webhook`,
      {
        url: WEBHOOK_URL,
        event_types: ['cast.created'],
        secret: webhookSecret,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'api-key': NEYNAR_API_KEY,
        },
      }
    );
    
    console.log('Webhook registered successfully!');
    console.log('Webhook ID:', response.data.id);
    console.log('Webhook Secret:', webhookSecret);
    console.log('Please save this secret in your environment variables as FARCASTER_WEBHOOK_SECRET');
    
    return response.data;
  } catch (error) {
    console.error('Error registering webhook:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

// Run the script
registerWebhook()
  .then((data) => {
    console.log('Webhook registration completed.');
  })
  .catch((error) => {
    console.error('Webhook registration failed:', error.message);
    process.exit(1);
  });
