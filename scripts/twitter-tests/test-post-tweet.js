// Script to test posting a tweet
const Twitter2FAClient = require('./twitter2FAClient');
require('dotenv').config();

async function testPostTweet() {
  try {
    console.log('Testing posting a tweet...');
    
    // Create Twitter client
    const twitterClient = new Twitter2FAClient();
    
    // Authenticate with Twitter
    console.log('Authenticating with Twitter...');
    const authenticated = await twitterClient.authenticate();
    
    if (authenticated) {
      console.log('Authentication successful!');
      
      // Test posting a tweet
      console.log('Posting a test tweet...');
      
      // Use the statuses/update endpoint
      const url = `${twitterClient.baseUrlV1}/statuses/update.json`;
      const text = `Test tweet from GitSplits worker agent at ${new Date().toISOString()}`;
      console.log(`Tweet text: ${text}`);
      
      try {
        // Convert to form data
        const params = new URLSearchParams();
        params.append('status', text);
        
        const response = await twitterClient.makeRequest('POST', url, params);
        
        if (response && response.id_str) {
          console.log('Tweet posted successfully!');
          console.log(`- ID: ${response.id_str}`);
          console.log(`- Text: ${response.text}`);
          console.log(`- Created: ${response.created_at}`);
          
          console.log('\nThe Twitter API is working correctly for posting tweets.');
          console.log('This suggests that the authentication is working correctly.');
        } else {
          console.log('Failed to post tweet');
        }
      } catch (error) {
        console.error('Error posting tweet:', error.message);
        console.error('Error details:', error.response?.data || 'No response data');
        
        console.log('\nThe Twitter API is not working for posting tweets.');
        console.log('This suggests that there might be issues with the Twitter API or with the authentication.');
      }
    } else {
      console.error('Authentication failed!');
    }
  } catch (error) {
    console.error('Error testing post tweet:', error);
  }
}

// Add the makeRequest method to the Twitter2FAClient prototype
Twitter2FAClient.prototype.makeRequest = async function(method, url, data = null) {
  try {
    // Ensure we're authenticated
    if (!this.authenticated) {
      await this.authenticate();
    }
    
    // Get the headers
    const headers = await this.getHeaders();
    
    // Make the request
    const axios = require('axios');
    let response;
    
    if (method === 'GET') {
      response = await axios.get(url, { headers });
    } else if (method === 'POST') {
      // Check if data is URLSearchParams
      if (data instanceof URLSearchParams) {
        // For form data, use x-www-form-urlencoded
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
        response = await axios.post(url, data.toString(), { headers });
      } else {
        // For JSON data
        response = await axios.post(url, data, { headers });
      }
    }
    
    return response.data;
  } catch (error) {
    console.error('Error making request:', error.message);
    console.error('Error details:', error.response?.data || 'No response data');
    throw error;
  }
};

// Run the test
testPostTweet();
