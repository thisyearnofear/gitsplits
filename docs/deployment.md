# Deployment Guide

This guide explains how to deploy the GitSplits X Agent, including both the NEAR smart contract and the Worker Agent running in a Trusted Execution Environment (TEE).

## Prerequisites

Before deployment, ensure you have:

- NEAR account with sufficient funds for contract deployment
- Docker Hub account for publishing the Worker Agent image
- Access to Phala Cloud for TEE deployment
- Node.js and Rust development environment set up

## Smart Contract Deployment

### 1. Build the Contract

Navigate to the contract directory and build the contract:

```bash
cd contracts/near
cargo near build
```

This will generate a WebAssembly binary in the `target/wasm32-unknown-unknown/release/` directory.

### 2. Deploy the Contract

Deploy the contract to your NEAR account:

```bash
cargo near deploy --accountId YOUR_ACCOUNT_ID
```

Replace `YOUR_ACCOUNT_ID` with your NEAR account ID (e.g., `gitsplits.near`).

### 3. Initialize the Contract

Initialize the contract with the required parameters:

```bash
near call YOUR_ACCOUNT_ID new '{}' --accountId YOUR_ACCOUNT_ID
```

## Worker Agent Deployment

### 1. Build the Docker Image

Update the Docker build configuration in `package.json` to use your Docker Hub username:

```json
"scripts": {
  "docker:build": "docker build -t yourusername/gitsplits-agent:latest .",
  "docker:push": "docker push yourusername/gitsplits-agent:latest"
}
```

Build and push the Docker image:

```bash
yarn docker:build
yarn docker:push
```

Note the SHA256 hash of your Docker image, which will be displayed in the build output.

### 2. Prepare Deployment Configuration

Create a `docker-compose.yaml` file for Phala Cloud deployment:

```yaml
version: '3'
services:
  worker:
    image: yourusername/gitsplits-agent:latest@sha256:your-image-hash
    environment:
      - NEXT_PUBLIC_contractId=YOUR_ACCOUNT_ID
      - NEXT_PUBLIC_workerName=gitsplits-worker
      - NODE_ENV=production
    ports:
      - '3000:3000'
```

Replace:
- `yourusername` with your Docker Hub username
- `your-image-hash` with the SHA256 hash of your Docker image
- `YOUR_ACCOUNT_ID` with your NEAR account ID

### 3. Deploy to Phala Cloud

1. Log in to [Phala Cloud](https://console.phala.network)
2. Click **Deploy**, then select **From Sketch**
3. Go to the **Advanced** tab
4. Paste your `docker-compose.yaml` configuration
5. Name your instance (e.g., `gitsplits-agent`)
6. Select appropriate resources (recommended: at least 2 CPU cores and 4GB RAM)
7. Click **Deploy**

### 4. Monitor Deployment

1. Once deployed, click on the instance name to view details
2. Check the **Network** tab to find the public URL of your Worker Agent
3. Check the **Containers** tab to view logs and ensure the service is running

## Worker Agent Registration

### 1. Fund the Ephemeral Account

When your Worker Agent starts, it will generate an ephemeral NEAR account. You'll need to fund this account with a small amount of NEAR for gas fees.

The ephemeral account ID will be displayed in the Worker Agent logs. Send at least 1 NEAR to this account.

### 2. Register the Worker Agent

Trigger the registration process by visiting:

```
https://your-worker-url/api/register
```

Replace `your-worker-url` with the public URL of your Worker Agent from Phala Cloud.

This will generate a remote attestation quote and register the Worker Agent with your NEAR smart contract.

## X Integration Setup

### 1. Create a Developer Account

1. Apply for a developer account on the [X Developer Platform](https://developer.twitter.com)
2. Create a new project and app
3. Enable OAuth 2.0 and set up the required permissions

### 2. Configure Webhook

1. Set up an Account Activity API webhook subscription
2. Configure the webhook URL to point to your Worker Agent:
   ```
   https://your-worker-url/api/webhooks/twitter
   ```
3. Complete the CRC (Challenge-Response Check) validation

### 3. Update Environment Variables

Update your Worker Agent's environment variables in Phala Cloud:

```yaml
environment:
  - NEXT_PUBLIC_contractId=YOUR_ACCOUNT_ID
  - NEXT_PUBLIC_workerName=gitsplits-worker
  - TWITTER_CONSUMER_KEY=your-consumer-key
  - TWITTER_CONSUMER_SECRET=your-consumer-secret
  - TWITTER_ACCESS_TOKEN=your-access-token
  - TWITTER_ACCESS_TOKEN_SECRET=your-access-token-secret
  - TWITTER_WEBHOOK_ENV=your-webhook-env
  - NODE_ENV=production
```

## GitHub API Setup

### 1. Create a GitHub App

1. Go to your GitHub account settings
2. Navigate to Developer settings > GitHub Apps
3. Create a new GitHub App with the required permissions:
   - Repository contents: Read
   - Repository metadata: Read
   - User email addresses: Read

### 2. Update Environment Variables

Add GitHub API credentials to your Worker Agent's environment variables:

```yaml
environment:
  - GITHUB_APP_ID=your-app-id
  - GITHUB_PRIVATE_KEY=your-private-key
  - GITHUB_WEBHOOK_SECRET=your-webhook-secret
```

## Verification and Testing

### 1. Verify Worker Registration

Check if the Worker Agent is properly registered:

```bash
near view YOUR_ACCOUNT_ID is_worker_registered '{"account_id": "worker-account-id"}'
```

Replace `worker-account-id` with the ephemeral account ID of your Worker Agent.

### 2. Test X Commands

Send a test command on X:

```
@bankrbot @gitsplits version
```

The Worker Agent should respond with its version information.

### 3. Monitor Logs

Monitor the Worker Agent logs in Phala Cloud to ensure it's processing commands correctly.

## Troubleshooting

### Worker Registration Issues

If the Worker Agent fails to register:

1. Check if the ephemeral account has sufficient funds
2. Verify that the attestation process is completing successfully
3. Check the Worker Agent logs for any errors

### X Webhook Issues

If X commands aren't being processed:

1. Verify that the webhook is properly configured
2. Check that the CRC validation is passing
3. Ensure the Worker Agent has the correct X API credentials

### Smart Contract Issues

If contract calls are failing:

1. Check that the Worker Agent is properly registered
2. Verify that the contract methods are being called with the correct parameters
3. Ensure the contract has been initialized correctly

## Maintenance

### Updating the Worker Agent

To update the Worker Agent:

1. Build and push a new Docker image
2. Update the deployment configuration in Phala Cloud
3. Re-deploy the Worker Agent
4. Register the new Worker Agent with the smart contract

### Updating the Smart Contract

To update the smart contract:

1. Build the new contract
2. Deploy the updated contract
3. Migrate any necessary data from the old contract

## Security Considerations

- Regularly rotate X API credentials
- Monitor Worker Agent logs for suspicious activity
- Implement rate limiting for X commands
- Regularly update dependencies to patch security vulnerabilities
