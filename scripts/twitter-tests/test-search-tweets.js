// Script to test searching for tweets
const Twitter2FAClient = require('./twitter2FAClient');
require('dotenv').config();

async function testSearchTweets() {
  try {
    console.log('Testing searching for tweets...');
    
    // Create Twitter client
    const twitterClient = new Twitter2FAClient();
    
    // Authenticate with Twitter
    console.log('Authenticating with Twitter...');
    const authenticated = await twitterClient.authenticate();
    
    if (authenticated) {
      console.log('Authentication successful!');
      
      // Test searching for tweets
      console.log('Searching for tweets mentioning @gitsplits...');
      
      // Use the search endpoint directly
      const url = `${twitterClient.baseUrlV1}/search/tweets.json?q=%40gitsplits&count=10&tweet_mode=extended`;
      console.log(`Searching with URL: ${url}`);
      
      const response = await twitterClient.makeRequest('GET', url);
      
      if (response.statuses && response.statuses.length > 0) {
        console.log(`Found ${response.statuses.length} tweets`);
        
        // Display the tweets
        response.statuses.forEach((tweet, index) => {
          console.log(`\nTweet ${index + 1}:`);
          console.log(`- ID: ${tweet.id_str}`);
          console.log(`- Text: ${tweet.full_text}`);
          console.log(`- From: ${tweet.user.screen_name}`);
          console.log(`- Created: ${tweet.created_at}`);
        });
      } else {
        console.log('No tweets found');
      }
    } else {
      console.error('Authentication failed!');
    }
  } catch (error) {
    console.error('Error searching for tweets:', error);
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
testSearchTweets();
