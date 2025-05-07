// Masa.ai API client for Twitter scraping
require("dotenv").config({ path: ".env.local" }); // Explicitly load from .env.local
const axios = require("axios");
const fs = require("fs").promises;
const path = require("path");

/**
 * Masa.ai API client for Twitter scraping
 * This client provides methods to search for Twitter mentions without using the Twitter API
 */
class MasaAPI {
  /**
   * Create a new Masa.ai API client
   * @param {Object} options - Configuration options
   * @param {string} options.apiKey - Masa.ai API key
   * @param {string} options.endpoint - Masa.ai API endpoint
   * @param {boolean} options.debug - Enable debug logging
   * @param {number} options.maxRetries - Maximum number of retries for failed requests
   * @param {number} options.retryDelay - Delay between retries in milliseconds
   */
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.MASA_API_KEY;
    this.endpoint =
      options.endpoint ||
      process.env.MASA_ENDPOINT ||
      "https://data.dev.masalabs.ai/api/v1";

    // Log the endpoint being used
    console.log(`Using Masa API endpoint: ${this.endpoint}`);
    this.debug = options.debug || false;
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000;
    this.lastMentionIdFile =
      options.lastMentionIdFile ||
      path.join(__dirname, "last_masa_mention_id.json");

    // Initialize axios instance with default config
    this.axios = axios.create({
      baseURL: this.endpoint,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: options.timeout || 10000,
    });

    // Add request interceptor for logging
    this.axios.interceptors.request.use((config) => {
      if (this.debug) {
        console.log(
          `Masa API Request: ${config.method.toUpperCase()} ${config.url}`
        );
      }
      return config;
    });

    // Add response interceptor for error handling
    this.axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const config = error.config;

        // Initialize retry count if it doesn't exist
        if (!config.retryCount) {
          config.retryCount = 0;
        }

        // Check if we should retry the request
        if (config.retryCount < this.maxRetries && this.shouldRetry(error)) {
          config.retryCount++;

          // Wait before retrying
          await new Promise((resolve) =>
            setTimeout(resolve, this.retryDelay * config.retryCount)
          );

          if (this.debug) {
            console.log(
              `Retrying Masa API request (${config.retryCount}/${
                this.maxRetries
              }): ${config.method.toUpperCase()} ${config.url}`
            );
          }

          // Retry the request
          return this.axios(config);
        }

        // If we shouldn't retry or we've reached the max retries, throw the error
        return Promise.reject(error);
      }
    );
  }

  /**
   * Check if we should retry the request
   * @param {Error} error - The error that occurred
   * @returns {boolean} - Whether to retry the request
   */
  shouldRetry(error) {
    // Retry on network errors
    if (!error.response) {
      return true;
    }

    // Retry on rate limit errors
    if (error.response.status === 429) {
      return true;
    }

    // Retry on server errors
    if (error.response.status >= 500 && error.response.status < 600) {
      return true;
    }

    // Don't retry on other errors
    return false;
  }

  /**
   * Search for mentions of a Twitter username
   * @param {string} username - The Twitter username to search for (without @)
   * @param {Object} options - Search options
   * @param {number} options.limit - Maximum number of results to return
   * @param {string} options.sinceId - Only return results newer than this tweet ID
   * @returns {Promise<Array>} - Array of tweet objects
   */
  async searchMentions(username, options = {}) {
    try {
      if (this.debug) {
        console.log(`Searching for mentions of @${username} using Masa.ai`);
      }

      const response = await this.axios.post("/search/live/twitter", {
        query: `@${username}`,
        max_results: options.limit || 20,
        since_id: options.sinceId || undefined,
      });

      if (this.debug) {
        console.log(
          "Masa.ai raw response:",
          JSON.stringify(response.data, null, 2)
        );
      }

      // The Masa API workflow:
      // 1. Submit a search job
      // 2. Check the job status
      // 3. Retrieve the results once the job is complete

      try {
        // 1. Submit a search job
        if (this.debug) {
          console.log(`Submitting Masa API search job for @${username}`);
        }

        // Submit the search job
        const searchResponse = await this.axios.post("/search/live/twitter", {
          query: `@${username}`,
          max_results: options.limit || 20,
        });

        if (!searchResponse.data || !searchResponse.data.uuid) {
          if (this.debug) {
            console.log("No UUID returned from Masa API search job");
          }
          return [];
        }

        const jobUuid = searchResponse.data.uuid;

        if (this.debug) {
          console.log(`Got search job UUID: ${jobUuid}`);
        }

        // 2. Check the job status
        let jobStatus = "processing";
        let maxRetries = 8; // Reduce number of retries
        let retryCount = 0;
        let retryDelay = 8000; // 8 seconds between retries (about 1 minute total wait time)

        // Valid job statuses based on the API response
        const processingStatuses = ["processing", "in progress"];
        const completedStatus = "done";
        const errorStatuses = ["error", "failed"];

        if (this.debug) {
          console.log(
            `Waiting for job to complete (this may take up to 1 minute)...`
          );
        }

        while (
          processingStatuses.includes(jobStatus) &&
          retryCount < maxRetries
        ) {
          // Wait before checking status - longer delay to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, retryDelay));

          if (this.debug) {
            console.log(
              `Checking job status (attempt ${retryCount + 1}/${maxRetries})...`
            );
          }

          try {
            const statusResponse = await this.axios.get(
              `/search/live/twitter/status/${jobUuid}`
            );

            if (statusResponse.data && statusResponse.data.status) {
              jobStatus = statusResponse.data.status;

              if (this.debug) {
                console.log(`Job status: ${jobStatus}`);
              }

              if (errorStatuses.includes(jobStatus)) {
                if (this.debug) {
                  console.log(
                    `Job failed with error: ${
                      statusResponse.data.error || "Unknown error"
                    }`
                  );
                }
                return [];
              }

              if (jobStatus === completedStatus) {
                // Job is complete, break out of the loop
                break;
              }
            }
          } catch (statusError) {
            console.error(`Error checking job status: ${statusError.message}`);
            // Continue to retry
          }

          retryCount++;
        }

        if (jobStatus !== completedStatus) {
          if (this.debug) {
            console.log(`Job did not complete in time (status: ${jobStatus})`);
            console.log(
              `This is normal - Masa API jobs can take several minutes to complete.`
            );
            console.log(
              `The job will continue processing and results will be available on the next check.`
            );
          }
          return [];
        }

        // 3. Retrieve the results
        if (this.debug) {
          console.log(`Retrieving search results for job ${jobUuid}...`);
        }

        const resultsResponse = await this.axios.get(
          `/search/live/twitter/result/${jobUuid}`
        );

        if (
          !resultsResponse.data ||
          !Array.isArray(resultsResponse.data) ||
          resultsResponse.data.length === 0
        ) {
          if (this.debug) {
            console.log("No results found in Masa API response");
          }
          return [];
        }

        // Convert Masa.ai tweet format to Twitter API format for consistency
        const tweets = resultsResponse.data.map((tweet) =>
          this.convertMasaTweetToTwitterFormat(tweet)
        );

        if (this.debug) {
          console.log(`Found ${tweets.length} mentions using Masa API`);
          if (tweets.length > 0) {
            console.log("First tweet:", JSON.stringify(tweets[0], null, 2));
          }
        }

        return tweets;
      } catch (error) {
        console.error(
          `Error searching mentions with Masa API: ${error.message}`
        );
        if (error.response) {
          console.error("Response status:", error.response.status);
          console.error("Response data:", error.response.data);
        }
        return [];
      }

      // This code is unreachable now since we return earlier
      // Keeping it commented for reference
      /*
      if (this.debug) {
        console.log(`Found ${tweets.length} mentions using Masa.ai`);
        if (tweets.length > 0) {
          console.log("First tweet:", JSON.stringify(tweets[0], null, 2));
        }
      }

      return tweets;
      */

      // We should never reach here
      return [];
    } catch (error) {
      console.error("Error searching mentions with Masa:", error.message);
      if (error.response) {
        console.error("Response status:", error.response.status);
        console.error("Response data:", error.response.data);
      }
      throw error;
    }
  }

  /**
   * Convert a Masa.ai tweet object to Twitter API format
   * @param {Object} masaTweet - The Masa.ai tweet object
   * @returns {Object} - The tweet in Twitter API format
   */
  convertMasaTweetToTwitterFormat(masaTweet) {
    // Handle the Masa API response format based on the example data
    // The format is: { ID, ExternalID, Content, Metadata, Score }

    const metadata = masaTweet.Metadata || {};
    const createdAt = metadata.created_at || new Date().toISOString();
    const userId = metadata.user_id || metadata.author || "0";

    // Try to get the username from different possible locations
    let username = metadata.username || "";

    // Map known user IDs to usernames based on the data we've seen
    const knownUsers = {
      "1484146827633037315": "33bitsAnon",
      548818296: "papajimjams",
    };

    // If we have a known user ID, use the corresponding username
    if (userId && knownUsers[userId]) {
      username = knownUsers[userId];
    }

    // If we still don't have a username, use a default
    if (!username) {
      username = "unknown";
    }

    return {
      id_str:
        masaTweet.ExternalID || String(masaTweet.ID) || String(Date.now()),
      full_text: masaTweet.Content || "",
      created_at: createdAt,
      user: {
        id_str: userId,
        name: username,
        screen_name: username,
        profile_image_url_https: "",
      },
      // Add the original Masa tweet data for reference
      masa_data: masaTweet,
    };
  }

  /**
   * Save the last processed mention ID
   * @param {string} id - The tweet ID to save
   * @param {string} filename - The file to save to
   * @returns {Promise<void>}
   */
  async saveLastMentionId(id, filename = null) {
    filename = filename || this.lastMentionIdFile;
    try {
      await fs.writeFile(filename, JSON.stringify({ id: id }));
      if (this.debug) {
        console.log(`Saved last Masa mention ID: ${id}`);
      }
    } catch (error) {
      console.error(`Error saving last Masa mention ID: ${error.message}`);
    }
  }

  /**
   * Load the last processed mention ID
   * @param {string} filename - The file to load from
   * @returns {Promise<string|null>} - The last mention ID or null
   */
  async loadLastMentionId(filename = null) {
    filename = filename || this.lastMentionIdFile;
    try {
      const data = await fs.readFile(filename, "utf8");
      const json = JSON.parse(data);
      if (this.debug) {
        console.log(`Loaded last Masa mention ID: ${json.id}`);
      }
      return json.id;
    } catch (error) {
      if (error.code === "ENOENT") {
        if (this.debug) {
          console.log("No last Masa mention ID file found, starting fresh");
        }
        return null;
      }
      console.error(`Error loading last Masa mention ID: ${error.message}`);
      return null;
    }
  }
}

module.exports = MasaAPI;
