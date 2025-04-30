# Twitter Integration Setup Guide

This guide explains how to set up the Twitter integration for GitSplits X Agent using a free Twitter account.

## Overview

GitSplits X Agent uses Twitter's Account Activity API to receive notifications when users mention `@bankrbot @gitsplits` in their tweets. The agent then processes these mentions as commands and responds accordingly.

Since we're using a free Twitter account, we'll use the "Cookie Auth" method, which involves copying authentication tokens from your browser after logging in to Twitter.

## Prerequisites

1. A Twitter account for your bot (e.g., `@gitsplits`)
2. A publicly accessible URL for your webhook endpoint (e.g., using ngrok for development)
3. Access to your Twitter account through a web browser

## Step 1: Set Up Environment Variables

Add the following environment variables to your `.env` file:

```
# X API Configuration
TWITTER_CONSUMER_KEY=your_twitter_consumer_key
TWITTER_CONSUMER_SECRET=your_twitter_consumer_secret
TWITTER_ACCESS_TOKEN=your_twitter_access_token
TWITTER_ACCESS_TOKEN_SECRET=your_twitter_access_token_secret
TWITTER_WEBHOOK_ENV=your_twitter_webhook_env
TWITTER_SCREEN_NAME=gitsplits
```

## Step 2: Obtain Authentication Tokens

Since we're using the Cookie Auth method, you'll need to:

1. Log in to Twitter with your bot account in a web browser
2. Open the browser's developer tools (F12 or right-click > Inspect)
3. Go to the "Application" tab (Chrome) or "Storage" tab (Firefox)
4. Look for cookies or local storage items related to authentication
5. Copy the relevant tokens to your environment variables

The specific tokens you need are:
- `auth_token` (cookie)
- `ct0` (cookie, also known as CSRF token)

These will be used as your `TWITTER_ACCESS_TOKEN` and `TWITTER_ACCESS_TOKEN_SECRET` respectively.

## Step 3: Register Your Webhook URL

Use the admin interface to register your webhook URL:

1. Start your development server: `npm run dev`
2. Navigate to `/admin/twitter-setup` in your browser
3. Enter your webhook URL (e.g., `https://your-domain.com/api/webhooks/twitter`)
4. Click "Register Webhook"

Alternatively, you can use the API directly:

```bash
curl -X POST https://your-domain.com/api/webhooks/twitter/register \
  -H "Content-Type: application/json" \
  -d '{"webhookUrl": "https://your-domain.com/api/webhooks/twitter"}'
```

## Step 4: Test the Integration

1. Make sure your webhook endpoint is publicly accessible
2. Send a test tweet mentioning `@bankrbot @gitsplits help`
3. Check your server logs to see if the webhook is receiving the mention
4. Verify that your bot responds to the tweet

## Troubleshooting

### Webhook Registration Fails

- Make sure your webhook URL is publicly accessible
- Check that your Twitter API credentials are correct
- Verify that your webhook endpoint responds correctly to the CRC check

### Bot Doesn't Respond to Mentions

- Check your server logs for errors
- Make sure your webhook is registered correctly
- Verify that your Twitter API credentials have the necessary permissions
- Check if your bot account is rate-limited

### Rate Limiting

Free Twitter accounts may be subject to rate limiting. If you encounter rate limits:

- Implement exponential backoff for retries
- Reduce the frequency of API calls
- Consider upgrading to a paid Twitter API account for production use

## Production Considerations

For a production environment, consider:

1. Using the official Twitter API with a paid account
2. Implementing proper error handling and retry logic
3. Setting up monitoring for your webhook endpoint
4. Using a database to store message history and user preferences
5. Implementing proper security measures to protect your webhook endpoint

## Resources

- [Twitter Account Activity API Documentation](https://developer.twitter.com/en/docs/twitter-api/enterprise/account-activity-api/overview)
- [Twitter API Rate Limits](https://developer.twitter.com/en/docs/twitter-api/rate-limits)
- [Eliza OS Agent Twitter Client](https://github.com/elizaos/twitter-client)
- [Shade Agent JS Repository](https://github.com/NearDeFi/shade-agent-js)
