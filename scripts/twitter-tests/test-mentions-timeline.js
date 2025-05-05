// Script to test the mentions timeline
const Twitter2FAClient = require('./twitter2FAClient');
require('dotenv').config();

async function testMentionsTimeline() {
  try {
    console.log('Testing mentions timeline...');
    
    // Create Twitter client
    const twitterClient = new Twitter2FAClient();
    
    // Authenticate with Twitter
    console.log('Authenticating with Twitter...');
    const authenticated = await twitterClient.authenticate();
    
    if (authenticated) {
      console.log('Authentication successful!');
      
      // Test getting mentions
      console.log('Getting mentions from Twitter API...');
      
      try {
        // Use the mentions_timeline endpoint directly
        const url = `${twitterClient.baseUrlV1}/statuses/mentions_timeline.json?count=20&tweet_mode=extended`;
        console.log(`Fetching mentions from: ${url}`);
        
        const response = await twitterClient.makeRequest('GET', url);
        
        if (response && response.length > 0) {
          console.log(`Found ${response.length} mentions`);
          
          // Display the mentions
          response.forEach((mention, index) => {
            console.log(`\nMention ${index + 1}:`);
            console.log(`- ID: ${mention.id_str}`);
            console.log(`- Text: ${mention.full_text}`);
            console.log(`- From: ${mention.user.screen_name}`);
            console.log(`- Created: ${mention.created_at}`);
          });
        } else {
          console.log('No mentions found');
        }
      } catch (error) {
        console.error('Error getting mentions:', error.message);
        console.error('Error details:', error.response?.data || 'No response data');
        
        // If we get error 37 (no access to resource), try an alternative approach
        if (error.response?.data?.errors?.[0]?.code === 37) {
          console.log("Your Twitter account doesn't have access to the mentions_timeline endpoint.");
          console.log("This is common with free Twitter accounts. Trying an alternative approach...");
          
          // Try using the search API as an alternative
          console.log('\nTrying search API as an alternative...');
          const searchUrl = `${twitterClient.baseUrlV1}/search/tweets.json?q=%40${twitterClient.screenName}&count=10&tweet_mode=extended`;
          console.log(`Searching with URL: ${searchUrl}`);
          
          try {
            const searchResponse = await twitterClient.makeRequest('GET', searchUrl);
            
            if (searchResponse.statuses && searchResponse.statuses.length > 0) {
              console.log(`Found ${searchResponse.statuses.length} tweets mentioning @${twitterClient.screenName}`);
              
              // Display the tweets
              searchResponse.statuses.forEach((tweet, index) => {
                console.log(`\nTweet ${index + 1}:`);
                console.log(`- ID: ${tweet.id_str}`);
                console.log(`- Text: ${tweet.full_text}`);
                console.log(`- From: ${tweet.user.screen_name}`);
                console.log(`- Created: ${tweet.created_at}`);
              });
            } else {
              console.log('No tweets found mentioning @' + twitterClient.screenName);
            }
          } catch (searchError) {
            console.error('Error searching for tweets:', searchError.message);
            console.error('Error details:', searchError.response?.data || 'No response data');
          }
        }
      }
    } else {
      console.error('Authentication failed!');
    }
  } catch (error) {
    console.error('Error testing mentions timeline:', error);
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
testMentionsTimeline();
