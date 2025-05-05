// Script to test Twitter login information
const Twitter2FAClient = require('./twitter2FAClient');
require('dotenv').config();

async function testTwitterLogin() {
  try {
    console.log('Testing Twitter login information...');
    
    // Get the Twitter username and screen name from the environment variables
    const username = process.env.TWITTER_USERNAME;
    const screenName = process.env.TWITTER_SCREEN_NAME;
    
    console.log(`Twitter username: ${username}`);
    console.log(`Twitter screen name: ${screenName}`);
    
    // Create Twitter client
    const twitterClient = new Twitter2FAClient();
    
    // Authenticate with Twitter
    console.log('\nAuthenticating with Twitter...');
    const authenticated = await twitterClient.authenticate();
    
    if (authenticated) {
      console.log('Authentication successful!');
      
      // Test getting home timeline
      console.log('\nGetting home timeline from Twitter API...');
      
      // Use the home_timeline endpoint
      const homeUrl = `${twitterClient.baseUrlV1}/statuses/home_timeline.json?count=1&tweet_mode=extended`;
      console.log(`Fetching home timeline from: ${homeUrl}`);
      
      try {
        const homeResponse = await twitterClient.makeRequest('GET', homeUrl);
        
        if (homeResponse && homeResponse.length > 0) {
          console.log(`Found ${homeResponse.length} tweets`);
          
          // Display the tweets
          homeResponse.forEach((tweet, index) => {
            console.log(`\nTweet ${index + 1}:`);
            console.log(`- ID: ${tweet.id_str}`);
            console.log(`- Text: ${tweet.full_text}`);
            console.log(`- From: ${tweet.user.screen_name}`);
            console.log(`- Created: ${tweet.created_at}`);
          });
        } else {
          console.log('No tweets found in home timeline');
        }
      } catch (error) {
        console.error('Error getting home timeline:', error.message);
        console.error('Error details:', error.response?.data || 'No response data');
      }
    } else {
      console.error('Authentication failed!');
    }
  } catch (error) {
    console.error('Error testing Twitter login:', error);
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
testTwitterLogin();
