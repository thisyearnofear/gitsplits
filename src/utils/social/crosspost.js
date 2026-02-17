/**
 * Crosspost integration for Twitter posting
 * 
 * This module provides functions to post tweets and reply to tweets using the Crosspost service.
 * It uses the NEAR blockchain for authentication with borsh serialization.
 */

const { sha256 } = require('@noble/hashes/sha2');
const { generateNonce, uint8ArrayToBase64 } = require("near-sign-verify");
const borsh = require("borsh");
const nearAPI = require('near-api-js');
const { CrosspostClient } = require("@crosspost/sdk");
const { Platform } = require("@crosspost/types");

// Singleton client instance
let client = null;

/**
 * @typedef {object} TweetObject
 * @property {string} id - The ID of the tweet
 * @property {string} text - The text content of the tweet
 * @property {string} author_id - The author ID of the tweet
 * @property {string} created_at - The creation timestamp of the tweet
 */

/**
 * Posts a reply to a tweet using Crosspost
 * @param {string} text - The text content of the reply
 * @param {TweetObject} tweetToReplyTo - The tweet object to reply to
 * @param {boolean} [fakeReply=false] - If true, simulates the reply without actually sending
 * @returns {Promise<object>} - The response from the crossposting service
 */
const crosspostReply = async (text, tweetToReplyTo, fakeReply = false) => {
  console.log("crosspostReply to tweet ID:", tweetToReplyTo.id_str || tweetToReplyTo.id);

  if (fakeReply) {
    console.log(`FAKE_REPLY: Would reply to ${tweetToReplyTo.id_str || tweetToReplyTo.id} with: ${text}`);
    return { data: { id: "fake_reply_id" } };
  }

  if (!process.env.BOT_TWITTER_USER_ID) {
    console.warn("BOT_TWITTER_USER_ID environment variable is not set. Crossposting target userId might be incorrect.");
    throw new Error(`Bot twitter user id must be provided: ${process.env.BOT_TWITTER_USER_ID}`);
  }

  const message = "Post";
  const nonce = generateNonce();
  const recipient = "crosspost.near";
  const accountId = process.env.CROSSPOST_SIGNER_ID;
  const keyPairString = process.env.CROSSPOST_KEYPAIR;

  if (!accountId || !keyPairString) {
    console.error("CROSSPOST_SIGNER_ID or CROSSPOST_KEYPAIR environment variables are not set.");
    throw new Error("Crossposting credentials not configured.");
  }

  let authData;

  try {
    const signer = nearAPI.KeyPair.fromString(keyPairString);

    const TAG = 2147484061; // Magic number for verification

    const payload = {
      tag: TAG,
      message,
      nonce: Array.from(nonce),
      receiver: recipient,
      callback_url: null,
    };

    const schema = {
      struct: {
        tag: "u32",
        message: "string",
        nonce: { array: { type: "u8", len: 32 } },
        receiver: "string",
        callback_url: { option: "string" },
      },
    };

    const serializedPayload = borsh.serialize(schema, payload);
    const payloadHash = sha256(serializedPayload);
    const signedMessage = signer.sign(payloadHash);

    authData = {
      message,
      nonce: nonce,
      recipient,
      callback_url: "",
      signature: uint8ArrayToBase64(signedMessage.signature),
      account_id: accountId,
      public_key: signedMessage.publicKey.toString(),
    };
  } catch (e) {
    console.log("Error creating auth token for crossposting...", e);
    throw new Error("Error creating crossposting auth token.");
  }

  try {
    if (!client) {
      client = new CrosspostClient();
    }

    await client.setAuthentication(authData);

    const replyRequest = {
      targets: [
        {
          platform: Platform.TWITTER,
          userId: process.env.BOT_TWITTER_USER_ID,
        },
      ],
      platform: Platform.TWITTER,
      postId: tweetToReplyTo.id_str || tweetToReplyTo.id,
      content: [
        {
          text: text,
          // media: [] // Optional: include if sending media
        },
      ],
      account_id: accountId,
    };

    console.log("replyToPost with request:", JSON.stringify(replyRequest, null, 2));
    const res = await client.post.replyToPost(replyRequest);
    console.log("Crosspost reply response:", res);

    return { data: { id: res?.data?.results?.[0]?.details?.id || "unknown_id" } };
  } catch (e) {
    console.log("Error crossposting reply...", e);
    throw new Error(`Error crossposting reply: ${e.message}`);
  }
};

/**
 * Posts a new tweet using Crosspost
 * @param {string} text - The text content of the tweet
 * @param {boolean} [fakePost=false] - If true, simulates the post without actually sending
 * @returns {Promise<object>} - The response from the crossposting service
 */
const crosspostTweet = async (text, fakePost = false) => {
  console.log("crosspostTweet:", text);

  if (fakePost) {
    console.log(`FAKE_POST: Would post: ${text}`);
    return { data: { id: "fake_post_id" } };
  }

  if (!process.env.BOT_TWITTER_USER_ID) {
    console.warn("BOT_TWITTER_USER_ID environment variable is not set. Crossposting target userId might be incorrect.");
    throw new Error(`Bot twitter user id must be provided: ${process.env.BOT_TWITTER_USER_ID}`);
  }

  const message = "Post";
  const nonce = generateNonce();
  const recipient = "crosspost.near";
  const accountId = process.env.CROSSPOST_SIGNER_ID;
  const keyPairString = process.env.CROSSPOST_KEYPAIR;

  if (!accountId || !keyPairString) {
    console.error("CROSSPOST_SIGNER_ID or CROSSPOST_KEYPAIR environment variables are not set.");
    throw new Error("Crossposting credentials not configured.");
  }

  let authData;

  try {
    const signer = nearAPI.KeyPair.fromString(keyPairString);

    const TAG = 2147484061; // Magic number for verification

    const payload = {
      tag: TAG,
      message,
      nonce: Array.from(nonce),
      receiver: recipient,
      callback_url: null,
    };

    const schema = {
      struct: {
        tag: "u32",
        message: "string",
        nonce: { array: { type: "u8", len: 32 } },
        receiver: "string",
        callback_url: { option: "string" },
      },
    };

    const serializedPayload = borsh.serialize(schema, payload);
    const payloadHash = sha256(serializedPayload);
    const signedMessage = signer.sign(payloadHash);

    authData = {
      message,
      nonce: nonce,
      recipient,
      callback_url: "",
      signature: uint8ArrayToBase64(signedMessage.signature),
      account_id: accountId,
      public_key: signedMessage.publicKey.toString(),
    };
  } catch (e) {
    console.log("Error creating auth token for crossposting...", e);
    throw new Error("Error creating crossposting auth token.");
  }

  try {
    if (!client) {
      client = new CrosspostClient();
    }

    await client.setAuthentication(authData);

    const postRequest = {
      targets: [
        {
          platform: Platform.TWITTER,
          userId: process.env.BOT_TWITTER_USER_ID,
        },
      ],
      content: [
        {
          text: text,
          // media: [] // Optional: include if sending media
        },
      ],
      account_id: accountId,
    };

    console.log("createPost with request:", JSON.stringify(postRequest, null, 2));
    const res = await client.post.createPost(postRequest);
    console.log("Crosspost post response:", res);

    return { data: { id: res?.data?.results?.[0]?.details?.id || "unknown_id" } };
  } catch (e) {
    console.log("Error crossposting tweet...", e);
    throw new Error(`Error crossposting tweet: ${e.message}`);
  }
};

module.exports = {
  crosspostReply,
  crosspostTweet
};
