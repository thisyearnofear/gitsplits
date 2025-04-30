import axios from 'axios';
import crypto from 'crypto';

// Constants
const TWITTER_API_URL = 'https://api.twitter.com/1.1';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

/**
 * Twitter API client using Cookie Auth
 * This implementation uses the cookie-based authentication method
 * which requires copying auth tokens from browser local storage
 */
export class TwitterClient {
  private consumerKey: string;
  private consumerSecret: string;
  private accessToken: string;
  private accessTokenSecret: string;
  private screenName: string;

  constructor() {
    // Load credentials from environment variables
    this.consumerKey = process.env.TWITTER_CONSUMER_KEY || '';
    this.consumerSecret = process.env.TWITTER_CONSUMER_SECRET || '';
    this.accessToken = process.env.TWITTER_ACCESS_TOKEN || '';
    this.accessTokenSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET || '';
    this.screenName = process.env.TWITTER_SCREEN_NAME || 'gitsplits';

    // Validate credentials
    if (!this.consumerKey || !this.consumerSecret || !this.accessToken || !this.accessTokenSecret) {
      console.warn('Twitter API credentials not fully configured');
    }
  }

  /**
   * Send a reply to a tweet
   * @param tweetId The ID of the tweet to reply to
   * @param message The message to send
   * @returns The ID of the reply tweet
   */
  async sendReply(tweetId: string, message: string): Promise<string | null> {
    try {
      // Check if we're in development mode
      if (process.env.NODE_ENV === 'development') {
        console.log(`[DEV] Would send Twitter reply to ${tweetId}: ${message}`);
        return 'mock-tweet-id-' + Date.now();
      }

      // Prepare the request
      const endpoint = `${TWITTER_API_URL}/statuses/update.json`;
      const params = {
        status: message,
        in_reply_to_status_id: tweetId,
        auto_populate_reply_metadata: true
      };

      // Send the request
      const response = await this.makeTwitterRequest('POST', endpoint, params);
      
      // Return the ID of the new tweet
      return response.id_str;
    } catch (error) {
      console.error('Error sending Twitter reply:', error);
      return null;
    }
  }

  /**
   * Post a new tweet
   * @param message The message to tweet
   * @returns The ID of the new tweet
   */
  async postTweet(message: string): Promise<string | null> {
    try {
      // Check if we're in development mode
      if (process.env.NODE_ENV === 'development') {
        console.log(`[DEV] Would post tweet: ${message}`);
        return 'mock-tweet-id-' + Date.now();
      }

      // Prepare the request
      const endpoint = `${TWITTER_API_URL}/statuses/update.json`;
      const params = { status: message };

      // Send the request
      const response = await this.makeTwitterRequest('POST', endpoint, params);
      
      // Return the ID of the new tweet
      return response.id_str;
    } catch (error) {
      console.error('Error posting tweet:', error);
      return null;
    }
  }

  /**
   * Get information about a tweet
   * @param tweetId The ID of the tweet
   * @returns The tweet data
   */
  async getTweet(tweetId: string): Promise<any | null> {
    try {
      // Prepare the request
      const endpoint = `${TWITTER_API_URL}/statuses/show.json`;
      const params = { id: tweetId };

      // Send the request
      return await this.makeTwitterRequest('GET', endpoint, params);
    } catch (error) {
      console.error('Error getting tweet:', error);
      return null;
    }
  }

  /**
   * Make a request to the Twitter API
   * @param method The HTTP method
   * @param url The API endpoint
   * @param params The request parameters
   * @returns The response data
   */
  private async makeTwitterRequest(method: string, url: string, params: any): Promise<any> {
    let retries = 0;
    
    while (retries < MAX_RETRIES) {
      try {
        // Generate the OAuth signature
        const oauthHeader = this.generateOAuthHeader(method, url, params);
        
        // Make the request
        const response = method === 'GET' 
          ? await axios.get(url, { 
              params, 
              headers: { Authorization: oauthHeader } 
            })
          : await axios.post(url, null, { 
              params, 
              headers: { Authorization: oauthHeader } 
            });
        
        return response.data;
      } catch (error: any) {
        // Check if we should retry
        if (error.response && (error.response.status === 429 || error.response.status >= 500)) {
          retries++;
          if (retries < MAX_RETRIES) {
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * retries));
            continue;
          }
        }
        
        // Rethrow the error
        throw error;
      }
    }
    
    throw new Error(`Failed after ${MAX_RETRIES} retries`);
  }

  /**
   * Generate an OAuth header for a Twitter API request
   * @param method The HTTP method
   * @param url The API endpoint
   * @param params The request parameters
   * @returns The OAuth header
   */
  private generateOAuthHeader(method: string, url: string, params: any): string {
    const oauthParams: Record<string, string> = {
      oauth_consumer_key: this.consumerKey,
      oauth_nonce: crypto.randomBytes(16).toString('hex'),
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_token: this.accessToken,
      oauth_version: '1.0'
    };

    // Combine all parameters
    const allParams = { ...params, ...oauthParams };

    // Create parameter string
    const paramString = Object.keys(allParams)
      .sort()
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(allParams[key])}`)
      .join('&');

    // Create signature base string
    const signatureBaseString = [
      method.toUpperCase(),
      encodeURIComponent(url),
      encodeURIComponent(paramString)
    ].join('&');

    // Create signing key
    const signingKey = `${encodeURIComponent(this.consumerSecret)}&${encodeURIComponent(this.accessTokenSecret)}`;

    // Generate signature
    const signature = crypto
      .createHmac('sha1', signingKey)
      .update(signatureBaseString)
      .digest('base64');

    // Add signature to OAuth parameters
    oauthParams.oauth_signature = signature;

    // Create authorization header
    const authHeader = 'OAuth ' + Object.keys(oauthParams)
      .map(key => `${encodeURIComponent(key)}="${encodeURIComponent(oauthParams[key])}"`)
      .join(', ');

    return authHeader;
  }
}

// Create a singleton instance
export const twitterClient = new TwitterClient();
