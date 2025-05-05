# Farcaster Integration Scripts

This directory contains scripts for integrating GitSplits with Farcaster, a decentralized social network.

## Available Scripts

- `create-farcaster-bot.js`: Script to create a Farcaster bot using the Neynar API
- `register-webhook.js`: Script to register a webhook with Neynar
- `webhook-server.js`: Webhook server for Farcaster bot

## Setup

1. Install dependencies:
   ```bash
   npm install axios express body-parser crypto
   ```

2. Create a `.env` file with the following variables:
   ```
   # Neynar API configuration
   NEYNAR_API_KEY=your_neynar_api_key
   NEYNAR_APP_FID=your_neynar_app_fid
   
   # Farcaster bot configuration
   FARCASTER_SIGNER_UUID=your_farcaster_signer_uuid
   FARCASTER_WEBHOOK_URL=your_webhook_url
   FARCASTER_WEBHOOK_SECRET=your_webhook_secret
   FARCASTER_WEBHOOK_PORT=3002
   ```

## Usage

### Create a Farcaster Bot

```bash
node scripts/farcaster/create-farcaster-bot.js
```

This script will create a new Farcaster bot using the Neynar API. It will output a signer UUID that you should save in your `.env` file as `FARCASTER_SIGNER_UUID`.

### Register a Webhook

```bash
node scripts/farcaster/register-webhook.js
```

This script will register a webhook with Neynar. It will output a webhook secret that you should save in your `.env` file as `FARCASTER_WEBHOOK_SECRET`.

### Start the Webhook Server

```bash
node scripts/farcaster/webhook-server.js
```

This script will start a webhook server that listens for mentions of your Farcaster bot and responds to commands.

## Command Structure

The Farcaster bot supports the following commands:

| Command | Description | Example |
|---------|-------------|---------|
| `<repo>` | Analyze repository contributions | `@gitsplits near/near-sdk-rs` |
| `create split <repo> [allocation]` | Create a split for a repository | `@gitsplits create split near/near-sdk-rs default` |
| `splits <repo>` | View active splits for a repository | `@gitsplits splits near/near-sdk-rs` |
| `help` | Show help message | `@gitsplits help` |

## Notes

- The webhook server needs to be publicly accessible. You can use a service like ngrok for local development.
- The webhook URL should be the public URL of your webhook server, e.g., `https://your-domain.com/webhook`.
- The webhook secret is used to verify that webhook events are coming from Neynar. Keep it secret!
