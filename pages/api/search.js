/**
 * API endpoint for searching tweets and processing them
 * 
 * This endpoint searches for tweets mentioning GitSplits and processes them
 */

import { searchMasaTweets } from '../../utils/social/masa';
import { crosspostReply } from '../../utils/social/crosspost';

// Store the last seen tweet timestamp
let lastTimestamp = process.env.TWITTER_LAST_TIMESTAMP || 0;

/**
 * Processes a tweet to check if it's a valid request
 * @param {object} tweet - The tweet object
 * @returns {boolean} - Whether the tweet is a valid request
 */
const isValidRequest = (tweet) => {
  // Check if the tweet contains ".base.eth"
  return tweet.text.includes('.base.eth');
};

/**
 * Handles the API request
 * @param {object} req - The request object
 * @param {object} res - The response object
 */
export default async function handler(req, res) {
  // Check if this is a restart request with the correct password
  const pass = req.query.pass;
  const restartPass = process.env.RESTART_PASS;
  
  if (pass !== restartPass) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    console.log('Starting tweet search...');
    
    // Convert lastTimestamp to ISO string if it's a number
    let startTime = null;
    if (lastTimestamp && !isNaN(parseInt(lastTimestamp))) {
      startTime = new Date(parseInt(lastTimestamp)).toISOString();
    }
    
    // Search for tweets mentioning GitSplits
    const tweets = await searchMasaTweets('@GitSplits', startTime);
    
    console.log(`Found ${tweets.length} tweets mentioning GitSplits`);
    
    // Process each tweet
    const processedTweets = [];
    
    for (const tweet of tweets) {
      try {
        console.log(`Processing tweet: ${tweet.id}`);
        console.log(`Tweet text: ${tweet.text}`);
        
        // Check if this is a valid request
        if (isValidRequest(tweet)) {
          console.log('Valid request detected, preparing response...');
          
          // Extract the domain name from the tweet
          const domainMatch = tweet.text.match(/([a-zA-Z0-9-]+\.base\.eth)/);
          const domain = domainMatch ? domainMatch[1] : null;
          
          if (domain) {
            // Prepare the response text
            const responseText = `Thanks for your interest in ${domain}! We're processing your request. Please check back soon.`;
            
            // Reply to the tweet
            const replyResult = await crosspostReply(responseText, tweet);
            
            console.log(`Reply sent with ID: ${replyResult.data.id}`);
            
            processedTweets.push({
              id: tweet.id,
              domain,
              response: responseText,
              replyId: replyResult.data.id,
            });
          } else {
            console.log('Could not extract domain name from tweet');
          }
        } else {
          console.log('Not a valid request, skipping');
        }
        
        // Update the last timestamp if this tweet is newer
        const tweetTimestamp = new Date(tweet.created_at).getTime();
        if (tweetTimestamp > lastTimestamp) {
          lastTimestamp = tweetTimestamp;
        }
      } catch (error) {
        console.error(`Error processing tweet ${tweet.id}: ${error.message}`);
      }
    }
    
    // Return the results
    return res.status(200).json({
      success: true,
      tweetsFound: tweets.length,
      tweetsProcessed: processedTweets.length,
      processedTweets,
      lastTimestamp,
    });
  } catch (error) {
    console.error(`Error in search API: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
}
