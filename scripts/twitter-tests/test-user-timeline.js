// Script to test the user timeline
const Twitter2FAClient = require('./twitter2FAClient');
require('dotenv').config();

async function testUserTimeline() {
  try {
    console.log('Testing user timeline...');
    
    // Create Twitter client
    const twitterClient = new Twitter2FAClient();
    
    // Authenticate with Twitter
    console.log('Authenticating with Twitter...');
    const authenticated = await twitterClient.authenticate();
    
    if (authenticated) {
      console.log('Authentication successful!');
      
      // Test getting user timeline
      console.log('Getting user timeline from Twitter API...');
      
      // Use the user_timeline endpoint
      const url = `${twitterClient.baseUrlV1}/statuses/user_timeline.json?screen_name=${twitterClient.screenName}&count=5&tweet_mode=extended`;
      console.log(`Fetching user timeline from: ${url}`);
      
      try {
        const response = await twitterClient.makeRequest('GET', url);
        
        if (response && response.length > 0) {
          console.log(`Found ${response.length} tweets`);
          
          // Display the tweets
          response.forEach((tweet, index) => {
            console.log(`\nTweet ${index + 1}:`);
            console.log(`- ID: ${tweet.id_str}`);
            console.log(`- Text: ${tweet.full_text}`);
            console.log(`- Created: ${tweet.created_at}`);
          });
        } else {
          console.log('No tweets found');
        }
      } catch (error) {
        console.error('Error getting user timeline:', error.message);
        console.error('Error details:', error.response?.data || 'No response data');
      }
      
      // Also check the home timeline
      console.log('\nGetting home timeline from Twitter API...');
      
      // Use the home_timeline endpoint
      const homeUrl = `${twitterClient.baseUrlV1}/statuses/home_timeline.json?count=5&tweet_mode=extended`;
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
          console.log('No tweets found');
        }
      } catch (error) {
        console.error('Error getting home timeline:', error.message);
        console.error('Error details:', error.response?.data || 'No response data');
      }
    } else {
      console.error('Authentication failed!');
    }
  } catch (error) {
    console.error('Error testing user timeline:', error);
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
testUserTimeline();
