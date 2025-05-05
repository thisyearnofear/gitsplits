// Script to test getting account information
const Twitter2FAClient = require('./twitter2FAClient');
require('dotenv').config();

async function testAccountInfo() {
  try {
    console.log('Testing account information...');
    
    // Create Twitter client
    const twitterClient = new Twitter2FAClient();
    
    // Authenticate with Twitter
    console.log('Authenticating with Twitter...');
    const authenticated = await twitterClient.authenticate();
    
    if (authenticated) {
      console.log('Authentication successful!');
      
      // Test getting account information
      console.log('Getting account information from Twitter API...');
      
      // Use the account/settings endpoint
      const url = `${twitterClient.baseUrlV1}/account/settings.json`;
      console.log(`Fetching account settings from: ${url}`);
      
      try {
        const response = await twitterClient.makeRequest('GET', url);
        
        if (response) {
          console.log('Account settings:');
          console.log(JSON.stringify(response, null, 2));
          
          if (response.screen_name) {
            console.log(`\nThe authenticated account's screen name is: ${response.screen_name}`);
            
            if (response.screen_name !== twitterClient.screenName) {
              console.log(`\nWARNING: The authenticated account's screen name (${response.screen_name}) does not match the screen name in the .env file (${twitterClient.screenName})`);
              console.log(`You should update the TWITTER_SCREEN_NAME in your .env file to: ${response.screen_name}`);
            }
          }
        } else {
          console.log('No account settings found');
        }
      } catch (error) {
        console.error('Error getting account settings:', error.message);
        console.error('Error details:', error.response?.data || 'No response data');
        
        // Try an alternative endpoint
        console.log('\nTrying alternative endpoint...');
        const altUrl = `${twitterClient.baseUrlV1}/account/verify_credentials.json`;
        console.log(`Fetching account information from: ${altUrl}`);
        
        try {
          const altResponse = await twitterClient.makeRequest('GET', altUrl);
          
          if (altResponse) {
            console.log('Account information:');
            console.log(`- ID: ${altResponse.id_str}`);
            console.log(`- Name: ${altResponse.name}`);
            console.log(`- Screen Name: ${altResponse.screen_name}`);
            
            if (altResponse.screen_name !== twitterClient.screenName) {
              console.log(`\nWARNING: The authenticated account's screen name (${altResponse.screen_name}) does not match the screen name in the .env file (${twitterClient.screenName})`);
              console.log(`You should update the TWITTER_SCREEN_NAME in your .env file to: ${altResponse.screen_name}`);
            }
          } else {
            console.log('No account information found');
          }
        } catch (altError) {
          console.error('Error getting account information from alternative endpoint:', altError.message);
          console.error('Error details:', altError.response?.data || 'No response data');
        }
      }
    } else {
      console.error('Authentication failed!');
    }
  } catch (error) {
    console.error('Error testing account information:', error);
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
    const response = method === 'GET' 
      ? await axios.get(url, { headers })
      : await axios.post(url, data, { headers });
    
    return response.data;
  } catch (error) {
    console.error('Error making request:', error.message);
    console.error('Error details:', error.response?.data || 'No response data');
    throw error;
  }
};

// Run the test
testAccountInfo();
