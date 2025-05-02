# GitSplits Worker Agent

This is the Worker Agent for the GitSplits X Agent. It handles communication between X (Twitter), GitHub, and the NEAR smart contract.

## Overview

The Worker Agent is responsible for:

1. Processing X (Twitter) commands
2. Analyzing GitHub repository contributions
3. Interacting with the NEAR smart contract
4. Responding to user commands

## Prerequisites

- Node.js >= 18.0.0
- NEAR account with sufficient funds
- GitHub personal access token
- Twitter account with Cookie Auth credentials

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Create a `.env.local` file based on `.env.example`:

```bash
cp .env.example .env.local
```

3. Edit the `.env.local` file with your credentials:

```
# NEAR Configuration
NEAR_NETWORK_ID=mainnet
NEAR_NODE_URL=https://rpc.mainnet.near.org
NEAR_CONTRACT_ID=gitsplits-worker.papajams.near
NEAR_WALLET_URL=https://wallet.mainnet.near.org
NEAR_HELPER_URL=https://helper.mainnet.near.org
NEAR_ACCOUNT_ID=your-account.near
NEAR_PRIVATE_KEY=your-private-key

# GitHub Configuration
GITHUB_TOKEN=your-github-token

# Twitter Configuration (Cookie Auth)
TWITTER_AUTH_TOKEN=your-twitter-auth-token
TWITTER_CT0=your-twitter-ct0-token
TWITTER_SCREEN_NAME=gitsplits
TWITTER_LAST_TIMESTAMP=0

# Server Configuration
PORT=3001
```

4. Start the development server:

```bash
npm run dev
```

5. Run the tests:

```bash
npm run test:local
```

## Docker Deployment

1. Build the Docker image:

```bash
docker build -t gitsplits-worker-agent .
```

2. Run the Docker container:

```bash
docker run -p 3001:3001 --env-file .env.local gitsplits-worker-agent
```

## API Endpoints

### Health Check

```
GET /api/health
```

Returns the health status of the Worker Agent.

### Register Worker

```
POST /api/register
```

Registers the Worker Agent with the NEAR smart contract.

### Check Mentions

```
GET /api/check-mentions
```

Manually checks for new mentions on X (Twitter) and processes them.

### Twitter Webhook

```
POST /api/webhook/twitter
```

Receives webhook events from X (Twitter) and processes them.

## X Commands

The Worker Agent supports the following commands on X (Twitter):

- `@gitsplits <repo>`: Analyze repository contributions
- `@gitsplits create split <repo> [allocation]`: Create a split for a repository
- `@gitsplits splits <repo>`: View active splits for a repository
- `@gitsplits split <split_id>`: View split details
- `@gitsplits help`: Show help message

## Testing

You can test the Worker Agent locally without sending real tweets:

```bash
./test-commands.sh
```

Or test specific commands:

```bash
./test-commands.sh "github.com/near/near-sdk-rs"
./test-commands.sh "create split github.com/near/near-sdk-rs default"
```

## Deployment

See the [PRIVATE_DEPLOYMENT_DETAILS.md](../PRIVATE_DEPLOYMENT_DETAILS.md) for instructions on deploying the Worker Agent to a server.
