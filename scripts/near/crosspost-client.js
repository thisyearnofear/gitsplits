/**
 * Crosspost Client for Twitter Integration
 *
 * This client provides methods to post tweets and replies using the Crosspost.near contract
 * It requires a NEAR account with function call access to the crosspost.near contract
 */

const { connect, keyStores, KeyPair } = require("near-api-js");
const axios = require("axios");
const crypto = require("crypto");

class CrosspostClient {
  /**
   * Create a new Crosspost Client
   * @param {Object} options - Configuration options
   * @param {string} options.accountId - NEAR account ID (CROSSPOST_SIGNER_ID)
   * @param {string} options.privateKey - NEAR private key (CROSSPOST_KEYPAIR)
   * @param {string} options.botTwitterUserId - Twitter user ID (BOT_TWITTER_USER_ID)
   * @param {boolean} options.debug - Enable debug logging
   * @param {string} options.networkId - NEAR network ID (mainnet or testnet)
   */
  constructor(options = {}) {
    this.accountId = options.accountId || process.env.CROSSPOST_SIGNER_ID;
    this.privateKey = options.privateKey || process.env.CROSSPOST_KEYPAIR;
    this.botTwitterUserId =
      options.botTwitterUserId || process.env.BOT_TWITTER_USER_ID;
    this.debug = options.debug || false;
    this.networkId =
      options.networkId || process.env.NEAR_NETWORK_ID || "mainnet";
    this.initialized = false;
    this.nearAccount = null;
  }

  /**
   * Initialize the NEAR connection and account
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      if (this.debug) {
        console.log("Initializing Crosspost client...");
        console.log(`Account ID: ${this.accountId}`);
        console.log(`Network ID: ${this.networkId}`);
        console.log(`Bot Twitter User ID: ${this.botTwitterUserId}`);
      }

      // Set up NEAR connection
      const keyStore = new keyStores.InMemoryKeyStore();
      const keyPair = KeyPair.fromString(this.privateKey);
      await keyStore.setKey(this.networkId, this.accountId, keyPair);

      const config = {
        networkId: this.networkId,
        keyStore,
        nodeUrl: `https://rpc.${this.networkId}.near.org`,
        walletUrl: `https://wallet.${this.networkId}.near.org`,
        helperUrl: `https://helper.${this.networkId}.near.org`,
        explorerUrl: `https://explorer.${this.networkId}.near.org`,
      };

      const nearConnection = await connect(config);
      this.nearAccount = await nearConnection.account(this.accountId);

      if (this.debug) {
        console.log("Crosspost client initialized successfully");
      }

      this.initialized = true;
    } catch (error) {
      console.error(`Error initializing Crosspost client: ${error.message}`);
      if (error.stack && this.debug) {
        console.error(error.stack);
      }
      throw error;
    }
  }

  /**
   * Post a tweet using the Crosspost API
   * @param {string} text - The text of the tweet
   * @returns {Promise<Object>} - The posted tweet
   */
  async postTweet(text) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      if (this.debug) {
        console.log(`Posting tweet: ${text}`);
      }

      // Create a message to sign
      const message = `${Date.now()}-${this.accountId}`;

      // Sign the message with the NEAR private key
      const keyPair = KeyPair.fromString(this.privateKey);
      const signature = keyPair.sign(Buffer.from(message));

      // Convert the signature to base64
      const signatureBase64 = Buffer.from(signature.signature).toString(
        "base64"
      );

      // Get the public key
      const publicKey = keyPair.getPublicKey().toString();

      // Prepare the request payload
      const postRequest = {
        account_id: this.accountId,
        targets: [
          {
            platform: "twitter",
            userId: this.botTwitterUserId,
          },
        ],
        content: {
          text: text,
        },
      };

      if (this.debug) {
        console.log("Request payload:", JSON.stringify(postRequest, null, 2));
      }

      // Make the API call
      const response = await axios.post(
        "https://api.opencrosspost.com/api/post",
        postRequest,
        {
          headers: {
            "Content-Type": "application/json",
            "X-NEAR-Account-ID": this.accountId,
            "X-NEAR-Public-Key": publicKey,
            "X-NEAR-Signature": signatureBase64,
            "X-NEAR-Message": message,
          },
          maxRedirects: 5, // Allow up to 5 redirects
          validateStatus: function (status) {
            return status >= 200 && status < 500; // Accept all 2xx and 3xx status codes
          },
        }
      );

      if (this.debug) {
        console.log("Tweet posted successfully");
        console.log("Response:", JSON.stringify(response.data, null, 2));
      }

      return {
        id_str: response.data.id || Date.now().toString(),
        text: text,
        created_at: new Date().toISOString(),
        success: true,
        result: response.data,
      };
    } catch (error) {
      console.error(`Error posting tweet with Crosspost: ${error.message}`);
      if (error.stack && this.debug) {
        console.error(error.stack);
      }
      throw error;
    }
  }

  /**
   * Reply to a tweet using the Crosspost API
   * @param {string} text - The text of the reply
   * @param {string} replyToId - The ID of the tweet to reply to
   * @returns {Promise<Object>} - The posted reply
   */
  async replyTweet(text, replyToId) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      if (this.debug) {
        console.log(`Replying to tweet ${replyToId}: ${text}`);
      }

      // Create a message to sign
      const message = `${Date.now()}-${this.accountId}`;

      // Sign the message with the NEAR private key
      const keyPair = KeyPair.fromString(this.privateKey);
      const signature = keyPair.sign(Buffer.from(message));

      // Convert the signature to base64
      const signatureBase64 = Buffer.from(signature.signature).toString(
        "base64"
      );

      // Get the public key
      const publicKey = keyPair.getPublicKey().toString();

      // Prepare the request payload
      const postRequest = {
        account_id: this.accountId,
        targets: [
          {
            platform: "twitter",
            userId: this.botTwitterUserId,
          },
        ],
        content: {
          text: text,
          replyToId: replyToId,
        },
      };

      if (this.debug) {
        console.log("Request payload:", JSON.stringify(postRequest, null, 2));
      }

      // Make the API call
      const response = await axios.post(
        "https://api.opencrosspost.com/api/post",
        postRequest,
        {
          headers: {
            "Content-Type": "application/json",
            "X-NEAR-Account-ID": this.accountId,
            "X-NEAR-Public-Key": publicKey,
            "X-NEAR-Signature": signatureBase64,
            "X-NEAR-Message": message,
          },
          maxRedirects: 5, // Allow up to 5 redirects
          validateStatus: function (status) {
            return status >= 200 && status < 500; // Accept all 2xx and 3xx status codes
          },
        }
      );

      if (this.debug) {
        console.log("Reply posted successfully");
        console.log("Response:", JSON.stringify(response.data, null, 2));
      }

      return {
        id_str: response.data.id || Date.now().toString(),
        text: text,
        in_reply_to_status_id_str: replyToId,
        created_at: new Date().toISOString(),
        success: true,
        result: response.data,
      };
    } catch (error) {
      console.error(`Error replying to tweet with Crosspost: ${error.message}`);
      if (error.stack && this.debug) {
        console.error(error.stack);
      }
      throw error;
    }
  }
}

module.exports = CrosspostClient;
