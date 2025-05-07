# Twitter Integration Guide for GitSplits

GitSplits uses two main components for Twitter integration:

1. **Masa API** for searching tweets that mention GitSplits
2. **Crosspost** for posting tweets and replies from the GitSplits account

This guide explains how to set up and use both components. We've found this combination to be the most reliable for Twitter integration without requiring paid API access.

## Prerequisites

- A NEAR account (mainnet)
- A Twitter account for your bot
- A Masa API key

## Setting Up Crosspost Integration

Crosspost is a service that allows you to post to Twitter from your NEAR account. Here's how to set it up:

### Step 1: Create a NEAR Account

If you don't already have a NEAR account, create one at [wallet.near.org](https://wallet.near.org).

### Step 2: Connect Your Twitter Account to Crosspost

1. Visit [opencrosspost.com](https://opencrosspost.com)
2. Connect your NEAR wallet
3. Connect your Twitter account
4. Note your Twitter user ID (you'll need this for the `BOT_TWITTER_USER_ID` environment variable)

### Step 3: Generate a Function Call Access Key

You need to create a function call access key that allows your application to call the Crosspost contract. Use the `near-cli-rs` tool for this:

```bash
# Install near-cli-rs if you don't have it
npm install -g near-cli-rs

# Generate a keypair
near-cli-rs account create-function-call-access-key \
  --master-account YOUR_ACCOUNT.near \
  --contract-id crosspost.near \
  --allowance 1 \
  --public-key ed25519:YOUR_PUBLIC_KEY
```

The command will output a private key. Save this for the `CROSSPOST_KEYPAIR` environment variable.

### Step 4: Set Environment Variables

Add the following to your `.env.local` file:

```
CROSSPOST_SIGNER_ID=your_near_account.near
CROSSPOST_KEYPAIR=ed25519:your_private_key
BOT_TWITTER_USER_ID=your_twitter_user_id
```

## Setting Up Masa API Integration

Masa API is used to search for tweets that mention GitSplits.

### Step 1: Get a Masa API Key

1. Visit [data.dev.masalabs.ai/dashboard](https://data.dev.masalabs.ai/dashboard)
2. Create an account and get an API key
3. Add the API key to your `.env.local` file:

```
MASA_API_KEY=your_masa_api_key
```

## Testing the Integration

### Test Masa API

Run the following command to test the Masa API integration:

```bash
npm run twitter:test-masa
```

This will search for tweets mentioning "GitSplits" and display the results.

### Test Crosspost

Run the following command to test the Crosspost integration:

```bash
npm run twitter:test-crosspost
```

This will post a test tweet from your GitSplits Twitter account.

### Test Complete Integration

Run the following command to test the complete Twitter integration flow:

```bash
npm run twitter:test-integrated
```

This will:

1. Post a test tweet using Crosspost
2. Search for tweets mentioning GitSplits using Masa API
3. Reply to a tweet if one is found

## Troubleshooting

### Crosspost Issues

- **Error: Insufficient allowance**: Your function call access key doesn't have enough NEAR tokens. Create a new key with a higher allowance.
- **Error: Invalid signature**: Check that your `CROSSPOST_KEYPAIR` is correct.
- **Error: Account not found**: Make sure your `CROSSPOST_SIGNER_ID` is correct.

### Masa API Issues

- **Error: Invalid API key**: Check that your `MASA_API_KEY` is correct.
- **Error: Rate limit exceeded**: Masa API has a rate limit of 3 requests per second. Wait a few minutes and try again.
- **No results found**: Make sure there are tweets mentioning "GitSplits" or try a different search query.

## Implementation Details

### Project Structure

Our Twitter integration is organized as follows:

- **Core Modules**:

  - `scripts/twitter-integration/masa-api.js`: Masa API client for Twitter scraping
  - `utils/social/crosspost.js`: Crosspost client for Twitter posting

- **Test Scripts**:

  - `scripts/twitter-tests/test-masa-api.js`: Tests the Masa API integration
  - `scripts/crosspost-tests/test-crosspost-borsh.js`: Tests the Crosspost integration
  - `scripts/twitter-tests/test-twitter-integration.js`: Tests the complete flow

- **API Server**:
  - `scripts/api/api-server.js`: API server with endpoints for triggering processing

### Masa API Implementation

The Masa API implementation in `scripts/twitter-integration/masa-api.js` provides methods for:

- Searching for tweets mentioning a specific term
- Saving and loading the last processed tweet ID
- Handling rate limiting and pagination

The implementation uses the Masa API workflow:

1. Submit a search job
2. Check the job status (with retries)
3. Retrieve the results once the job is complete

### Crosspost Implementation

The Crosspost implementation in `utils/social/crosspost.js` provides methods for:

- Posting tweets
- Replying to tweets
- Handling authentication with the NEAR blockchain

The implementation uses borsh serialization for NEAR blockchain authentication, which has been tested and confirmed to work with the Crosspost service. This approach is more reliable than using the Crosspost SDK directly.

## API Reference

### Masa API

```javascript
// Import the MasaAPI class
const MasaAPI = require("./scripts/twitter-integration/masa-api");

// Create a Masa API client
const masaClient = new MasaAPI({
  debug: true, // Set to false in production
});

// Search for tweets mentioning GitSplits
const tweets = await masaClient.searchMentions("GitSplits", { limit: 10 });

// Process the tweets
for (const tweet of tweets) {
  console.log(`Tweet ID: ${tweet.id_str}`);
  console.log(`User: ${tweet.user.screen_name}`);
  console.log(`Text: ${tweet.full_text}`);
}

// Save the last processed tweet ID
await masaClient.saveLastMentionId(tweets[0].id_str);

// Load the last processed tweet ID
const lastId = await masaClient.loadLastMentionId();
```

### Crosspost

```javascript
// Import the Crosspost utilities
const { crosspostTweet, crosspostReply } = require("./utils/social/crosspost");

// Post a tweet
const tweetResult = await crosspostTweet("Hello from GitSplits!");
console.log(`Tweet posted with ID: ${tweetResult.data.id}`);

// Reply to a tweet
const replyResult = await crosspostReply("This is a reply", tweetObject);
console.log(`Reply posted with ID: ${replyResult.data.id}`);

// For testing without actually posting
const fakeTweetResult = await crosspostTweet("Test tweet", true); // true = fake post
```

### API Server

```javascript
// The API server provides endpoints for triggering processing
// Start the server with:
npm run api:server

// Test the server with:
npm run api:test

// Trigger processing via HTTP:
GET http://localhost:3001/api/search?pass=RESTART_PASS
```

## Conclusion

This Twitter integration approach using Masa API and Crosspost provides a reliable way to:

1. **Monitor Twitter** for mentions of GitSplits using the Masa API
2. **Respond to users** by posting tweets and replies using Crosspost
3. **Automate interactions** without requiring paid Twitter API access

The combination of these two services allows GitSplits to function as a Twitter bot that can respond to user requests and provide information about GitHub repository splits.

For deployment, we recommend:

1. Running the API server as a service on your server
2. Setting up a cron job to periodically trigger the `/api/search` endpoint
3. Monitoring the logs for any errors or issues
4. Refreshing your NEAR function call access key if you encounter authentication issues

By following this guide, you should have a working Twitter integration for GitSplits that can search for mentions and post replies without requiring paid API access.
