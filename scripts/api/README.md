# API Scripts

This directory contains scripts for the GitSplits API server.

## Available Scripts

- `api-server.js`: API server for GitSplits with endpoints for triggering processing and health checks

## Usage

### Running the API Server

```bash
node scripts/api/api-server.js
```

This will start the API server on port 3001 (or the port specified in the PORT environment variable).

## API Endpoints

- `GET /api/health`: Health check endpoint
- `GET /api/search?pass=RESTART_PASS`: Trigger processing endpoint (requires the RESTART_PASS parameter)

## Environment Variables

This script requires the following environment variables to be set in your `.env.local` file:

- `CROSSPOST_SIGNER_ID`: Your NEAR account ID
- `CROSSPOST_KEYPAIR`: Your NEAR private key with function call access to crosspost.near
- `BOT_TWITTER_USER_ID`: The Twitter user ID of your bot
- `RESTART_PASS`: Password for the restart endpoint (optional, defaults to 'RESTART_PASS')
- `PORT`: Port for the API server (optional, defaults to 3001)
