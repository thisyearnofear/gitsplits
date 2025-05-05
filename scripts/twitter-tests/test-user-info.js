// Script to test getting user information
const Twitter2FAClient = require('./twitter2FAClient');
require('dotenv').config();

async function testUserInfo() {
  try {
    console.log('Testing user information...');
    
    // Create Twitter client
    const twitterClient = new Twitter2FAClient();
    
    // Authenticate with Twitter
    console.log('Authenticating with Twitter...');
    const authenticated = await twitterClient.authenticate();
    
    if (authenticated) {
      console.log('Authentication successful!');
      
      // Test getting user information
      console.log('Getting user information from Twitter API...');
      
      // Use the users/show endpoint
      const url = `${twitterClient.baseUrlV1}/users/show.json?screen_name=${twitterClient.screenName}`;
      console.log(`Fetching user information from: ${url}`);
      
      try {
        const response = await twitterClient.makeRequest('GET', url);
        
        if (response) {
          console.log('User information:');
          console.log(`- ID: ${response.id_str}`);
          console.log(`- Name: ${response.name}`);
          console.log(`- Screen Name: ${response.screen_name}`);
          console.log(`- Description: ${response.description}`);
          console.log(`- Followers: ${response.followers_count}`);
          console.log(`- Following: ${response.friends_count}`);
          console.log(`- Tweets: ${response.statuses_count}`);
          console.log(`- Created: ${response.created_at}`);
        } else {
          console.log('No user information found');
        }
      } catch (error) {
        console.error('Error getting user information:', error.message);
        console.error('Error details:', error.response?.data || 'No response data');
        
        // Try an alternative endpoint
        console.log('\nTrying alternative endpoint...');
        const altUrl = `${twitterClient.baseUrlV1}/account/verify_credentials.json`;
        console.log(`Fetching user information from: ${altUrl}`);
        
        try {
          const altResponse = await twitterClient.makeRequest('GET', altUrl);
          
          if (altResponse) {
            console.log('User information (from verify_credentials):');
            console.log(`- ID: ${altResponse.id_str}`);
            console.log(`- Name: ${altResponse.name}`);
            console.log(`- Screen Name: ${altResponse.screen_name}`);
            console.log(`- Description: ${altResponse.description}`);
            console.log(`- Followers: ${altResponse.followers_count}`);
            console.log(`- Following: ${altResponse.friends_count}`);
            console.log(`- Tweets: ${altResponse.statuses_count}`);
            console.log(`- Created: ${altResponse.created_at}`);
          } else {
            console.log('No user information found');
          }
        } catch (altError) {
          console.error('Error getting user information from alternative endpoint:', altError.message);
          console.error('Error details:', altError.response?.data || 'No response data');
        }
      }
    } else {
      console.error('Authentication failed!');
    }
  } catch (error) {
    console.error('Error testing user information:', error);
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
testUserInfo();
