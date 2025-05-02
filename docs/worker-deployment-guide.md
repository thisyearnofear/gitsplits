# Worker Agent Deployment Guide

This guide explains how to deploy the GitSplits Worker Agent to Phala Cloud for TEE execution.

## Prerequisites

Before deployment, ensure you have:

1. A NEAR account with sufficient funds for contract deployment
2. Docker Hub account for publishing the Worker Agent image
3. Access to Phala Cloud for TEE deployment
4. Twitter account with Cookie Auth credentials
5. GitHub personal access token for repository access

## Step 1: Build and Push the Docker Image

1. Navigate to the worker directory:

```bash
cd worker
```

2. Update the Docker build configuration in `package.json` to use your Docker Hub username:

```json
"scripts": {
  "docker:build": "docker build -t yourusername/gitsplits-worker:latest .",
  "docker:push": "docker push yourusername/gitsplits-worker:latest"
}
```

3. Build and push the Docker image:

```bash
npm run docker:build
npm run docker:push
```

4. Note the SHA256 hash of your Docker image, which will be displayed in the build output.

## Step 2: Prepare Deployment Configuration

1. Create a `docker-compose.yaml` file for Phala Cloud deployment:

```yaml
version: '3'
services:
  worker:
    image: yourusername/gitsplits-worker:latest@sha256:your-image-hash
    environment:
      # NEAR Configuration
      - NEAR_NETWORK_ID=testnet
      - NEAR_NODE_URL=https://rpc.testnet.near.org
      - NEAR_CONTRACT_ID=your-contract-id.testnet
      - NEAR_WALLET_URL=https://wallet.testnet.near.org
      - NEAR_HELPER_URL=https://helper.testnet.near.org
      - NEAR_ACCOUNT_ID=your-account.testnet
      - NEAR_PRIVATE_KEY=your-private-key
      
      # GitHub Configuration
      - GITHUB_TOKEN=your-github-token
      
      # Twitter Configuration (Cookie Auth)
      - TWITTER_AUTH_TOKEN=your-twitter-auth-token
      - TWITTER_CT0=your-twitter-ct0-token
      - TWITTER_SCREEN_NAME=gitsplits
      - TWITTER_LAST_TIMESTAMP=0
      
      # Server Configuration
      - PORT=3001
      - NODE_ENV=production
    ports:
      - "3001:3001"
    restart: always
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:3001/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
```

Replace:
- `yourusername` with your Docker Hub username
- `your-image-hash` with the SHA256 hash of your Docker image
- `your-contract-id.testnet` with your NEAR contract ID
- `your-account.testnet` with your NEAR account ID
- `your-private-key` with your NEAR private key
- `your-github-token` with your GitHub personal access token
- `your-twitter-auth-token` and `your-twitter-ct0-token` with your Twitter Cookie Auth credentials

## Step 3: Deploy to Phala Cloud

1. Log in to [Phala Cloud](https://console.phala.network)
2. Click **Deploy**, then select **From Sketch**
3. Go to the **Advanced** tab
4. Paste your `docker-compose.yaml` configuration
5. Name your instance (e.g., `gitsplits-worker`)
6. Select appropriate resources (recommended: at least 2 CPU cores and 4GB RAM)
7. Click **Deploy**

## Step 4: Monitor Deployment

1. Once deployed, click on the instance name to view details
2. Check the **Logs** tab to ensure the worker agent is running correctly
3. Verify that the worker agent has registered with the NEAR contract by checking the logs for a successful registration message

## Step 5: Test the Worker Agent

1. Send a test command on X (Twitter):

```
@bankrbot @gitsplits help
```

2. Check the worker agent logs to see if it detected and processed the command
3. Verify that the worker agent responded to the tweet

## Troubleshooting

### Worker Registration Issues

If the worker agent fails to register with the NEAR contract:

1. Check that the NEAR contract is deployed and initialized correctly
2. Verify that the NEAR account has sufficient funds
3. Check that the private key is correct and has permission to call the contract
4. Review the worker agent logs for any error messages

### Twitter Integration Issues

If the worker agent is not detecting or responding to tweets:

1. Check that the Twitter Cookie Auth credentials are valid
2. Verify that the Twitter account is not rate-limited
3. Check the worker agent logs for any error messages related to Twitter API calls
4. Try manually triggering the mention check by calling the `/api/check-mentions` endpoint

### GitHub API Issues

If the worker agent is having trouble accessing GitHub repositories:

1. Check that the GitHub personal access token is valid and has the necessary permissions
2. Verify that the GitHub API rate limits have not been exceeded
3. Check the worker agent logs for any error messages related to GitHub API calls
