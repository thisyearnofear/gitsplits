# Crosspost Tests

This directory contains test scripts for Crosspost integration with GitSplits.

## Available Scripts

- `test-crosspost-borsh.js`: Tests Crosspost integration using borsh serialization

## Usage

### Testing Crosspost Integration

```bash
npm run twitter:test-crosspost
```

This script tests the Crosspost integration using the approach from the shade-agent-basednames repo.

## Environment Variables

These scripts require the following environment variables to be set in your `.env.local` file:

- `CROSSPOST_SIGNER_ID`: Your NEAR account ID
- `CROSSPOST_KEYPAIR`: Your NEAR private key with function call access to crosspost.near
- `BOT_TWITTER_USER_ID`: The Twitter user ID of your bot

For more information on setting up the Crosspost integration, see the [TWITTER_INTEGRATION.md](../../docs/twitter/TWITTER_INTEGRATION.md) file.
