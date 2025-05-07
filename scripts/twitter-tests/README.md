# Twitter Tests

This directory contains test scripts for Twitter integration with GitSplits.

## Available Scripts

- `test-masa-api.js`: Tests the Masa API integration for searching tweets
- `test-twitter-integration.js`: Tests the complete flow of searching for tweets and replying to them

## Usage

### Testing Masa API Integration

```bash
npm run twitter:test-masa
```

This script will search for tweets mentioning @GitSplits using the Masa API.

### Testing Complete Twitter Integration

```bash
npm run twitter:test-integrated
```

This script tests the complete flow:
1. Posts a test tweet using Crosspost
2. Searches for tweets mentioning GitSplits
3. Processes tweets and replies to valid requests

## Environment Variables

These scripts require the following environment variables to be set in your `.env.local` file:

```
MASA_API_KEY=your-masa-api-key
CROSSPOST_SIGNER_ID=your-near-account-id
CROSSPOST_KEYPAIR=your-generated-fcak-private-key
BOT_TWITTER_USER_ID=your-bot-user-id
```

For more information on setting up the Twitter integration, see the [TWITTER_INTEGRATION.md](../../docs/twitter/TWITTER_INTEGRATION.md) file.
