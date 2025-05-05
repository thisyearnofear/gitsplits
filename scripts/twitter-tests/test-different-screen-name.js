// Script to test a different screen name
const Twitter2FAClient = require('./twitter2FAClient');
require('dotenv').config();

async function testDifferentScreenName() {
  try {
    console.log('Testing a different screen name...');
    
    // Create Twitter client
    const twitterClient = new Twitter2FAClient();
    
    // Authenticate with Twitter
    console.log('Authenticating with Twitter...');
    const authenticated = await twitterClient.authenticate();
    
    if (authenticated) {
      console.log('Authentication successful!');
      
      // Test getting user information for a known Twitter account
      console.log('Getting user information for a known Twitter account...');
      
      // Use the users/show endpoint with a known Twitter account
      const knownScreenName = 'twitter'; // Official Twitter account
      const url = `${twitterClient.baseUrlV1}/users/show.json?screen_name=${knownScreenName}`;
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
          
          console.log('\nThe Twitter API is working correctly with a known screen name.');
          console.log('This suggests that the screen name "gitsplits" might not exist or might be using a different format.');
        } else {
          console.log('No user information found');
        }
      } catch (error) {
        console.error('Error getting user information:', error.message);
        console.error('Error details:', error.response?.data || 'No response data');
        
        console.log('\nThe Twitter API is not working even with a known screen name.');
        console.log('This suggests that there might be issues with the Twitter API or with the authentication.');
      }
      
      // Try with GitSplits6629
      console.log('\nTrying with screen name "GitSplits6629"...');
      const altScreenName = 'GitSplits6629';
      const altUrl = `${twitterClient.baseUrlV1}/users/show.json?screen_name=${altScreenName}`;
      console.log(`Fetching user information from: ${altUrl}`);
      
      try {
        const altResponse = await twitterClient.makeRequest('GET', altUrl);
        
        if (altResponse) {
          console.log('User information:');
          console.log(`- ID: ${altResponse.id_str}`);
          console.log(`- Name: ${altResponse.name}`);
          console.log(`- Screen Name: ${altResponse.screen_name}`);
          console.log(`- Description: ${altResponse.description}`);
          console.log(`- Followers: ${altResponse.followers_count}`);
          console.log(`- Following: ${altResponse.friends_count}`);
          console.log(`- Tweets: ${altResponse.statuses_count}`);
          console.log(`- Created: ${altResponse.created_at}`);
          
          console.log('\nFound the account with screen name "GitSplits6629".');
          console.log('You should update the TWITTER_SCREEN_NAME in your .env file to: GitSplits6629');
        } else {
          console.log('No user information found for GitSplits6629');
        }
      } catch (altError) {
        console.error('Error getting user information for GitSplits6629:', altError.message);
        console.error('Error details:', altError.response?.data || 'No response data');
      }
    } else {
      console.error('Authentication failed!');
    }
  } catch (error) {
    console.error('Error testing different screen name:', error);
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
testDifferentScreenName();
