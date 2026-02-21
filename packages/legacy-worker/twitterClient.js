// Twitter Client using Cookie Auth
const axios = require("axios");
const crypto = require("crypto");

class TwitterCookieClient {
  constructor(options = {}) {
    this.auth_token =
      options.auth_token || process.env.TWITTER_COOKIES_AUTH_TOKEN;
    this.ct0 = options.ct0 || process.env.TWITTER_COOKIES_CT0;
    this.guest_id = options.guest_id || process.env.TWITTER_COOKIES_GUEST_ID;
    this.baseUrl = "https://api.twitter.com/1.1";
    this.screenName =
      options.screenName || process.env.TWITTER_SCREEN_NAME || "gitsplits";

    if (!this.auth_token || !this.ct0) {
      console.warn(
        "Twitter Cookie Auth credentials not provided. Some functionality may be limited."
      );
    }
  }

  /**
   * Get headers for Twitter API requests
   * @returns {Object} - Headers
   */
  getHeaders() {
    const cookies = [`auth_token=${this.auth_token}`, `ct0=${this.ct0}`];

    if (this.guest_id) {
      cookies.push(`guest_id=${this.guest_id}`);
    }

    return {
      Authorization:
        "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs=1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA",
      Cookie: cookies.join("; "),
      "X-Csrf-Token": this.ct0,
      "Content-Type": "application/json",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    };
  }

  /**
   * Post a tweet
   * @param {string} text - Tweet text
   * @returns {Promise<Object>} - Tweet data
   */
  async tweet(text) {
    try {
      // Check if we're in development mode
      if (process.env.NODE_ENV === "development") {
        console.log(`[DEV] Would tweet: ${text}`);
        return { id_str: "mock-tweet-id-" + Date.now() };
      }

      const url = `${this.baseUrl}/statuses/update.json`;
      const response = await axios.post(
        url,
        { status: text },
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error(
        "Error posting tweet:",
        error.response?.data || error.message
      );
      throw new Error("Failed to post tweet");
    }
  }

  /**
   * Reply to a tweet
   * @param {string} text - Reply text
   * @param {string} in_reply_to_status_id - ID of the tweet to reply to
   * @returns {Promise<Object>} - Tweet data
   */
  async reply(text, in_reply_to_status_id) {
    try {
      // Check if we're in development mode
      if (process.env.NODE_ENV === "development") {
        console.log(`[DEV] Would reply to ${in_reply_to_status_id}: ${text}`);
        return { id_str: "mock-tweet-id-" + Date.now() };
      }

      const url = `${this.baseUrl}/statuses/update.json`;
      const response = await axios.post(
        url,
        {
          status: text,
          in_reply_to_status_id,
          auto_populate_reply_metadata: true,
        },
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error(
        "Error replying to tweet:",
        error.response?.data || error.message
      );
      throw new Error("Failed to reply to tweet");
    }
  }

  /**
   * Get tweet by ID
   * @param {string} id - Tweet ID
   * @returns {Promise<Object>} - Tweet data
   */
  async getTweet(id) {
    try {
      const url = `${this.baseUrl}/statuses/show.json?id=${id}&tweet_mode=extended`;
      const response = await axios.get(url, { headers: this.getHeaders() });
      return response.data;
    } catch (error) {
      console.error(
        "Error getting tweet:",
        error.response?.data || error.message
      );
      throw new Error("Failed to get tweet");
    }
  }

  /**
   * Get mentions timeline
   * @param {Object} options - Options
   * @returns {Promise<Array>} - Mentions
   */
  async getMentions(options = {}) {
    try {
      const params = new URLSearchParams({
        count: options.count || 20,
        tweet_mode: "extended",
        ...options,
      }).toString();

      const url = `${this.baseUrl}/statuses/mentions_timeline.json?${params}`;
      const response = await axios.get(url, { headers: this.getHeaders() });
      return response.data;
    } catch (error) {
      console.error(
        "Error getting mentions:",
        error.response?.data || error.message
      );
      throw new Error("Failed to get mentions");
    }
  }

  /**
   * Search for tweets
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Array>} - Search results
   */
  async search(query, options = {}) {
    try {
      const params = new URLSearchParams({
        q: query,
        count: options.count || 20,
        tweet_mode: "extended",
        result_type: options.result_type || "recent",
        ...options,
      }).toString();

      const url = `${this.baseUrl}/search/tweets.json?${params}`;
      const response = await axios.get(url, { headers: this.getHeaders() });
      return response.data.statuses;
    } catch (error) {
      console.error(
        "Error searching tweets:",
        error.response?.data || error.message
      );
      throw new Error("Failed to search tweets");
    }
  }
}

module.exports = TwitterCookieClient;
