# GitSplits Worker Agent Tests

This directory contains test scripts for the GitSplits Worker Agent. These tests are designed to help with local development and debugging of the worker agent.

## Test Structure

The tests are organized into the following directories:

- `contract/`: Tests for NEAR contract interaction
- `github/`: Tests for GitHub API integration
- `twitter/`: Tests for Twitter integration

## Running Tests

You can run all tests using the following command:

```bash
npm run test:local
```

Or run individual test scripts:

```bash
# Test NEAR contract interaction
node test/contract/test-contract-interaction.js

# Test GitHub API integration
node test/github/test-github-api.js

# Test Twitter integration
node test/twitter/test-twitter-client.js
```

## Environment Variables

The tests use the environment variables from the `.env.local` file in the worker directory. Make sure this file is properly configured before running the tests.

Required environment variables:

### NEAR Configuration
```
NEAR_NETWORK_ID=mainnet
NEAR_NODE_URL=https://rpc.mainnet.near.org
NEAR_CONTRACT_ID=gitsplits-worker.papajams.near
NEAR_WALLET_URL=https://wallet.mainnet.near.org
NEAR_HELPER_URL=https://helper.mainnet.near.org
NEAR_ACCOUNT_ID=your-account.near
NEAR_PRIVATE_KEY=ed25519:your-private-key
```

### GitHub Configuration
```
GITHUB_TOKEN=your-github-token
```

### Twitter Configuration (Cookie Auth)
```
TWITTER_AUTH_TOKEN=your-twitter-auth-token
TWITTER_CT0=your-twitter-ct0-token
TWITTER_SCREEN_NAME=gitsplits
TWITTER_LAST_TIMESTAMP=0
```

## Test Descriptions

### NEAR Contract Tests

Tests the interaction with the NEAR contract, including:
- Worker registration
- Split creation
- Split updates
- Parameter formatting

### GitHub API Tests

Tests the GitHub API integration, including:
- Repository validation
- Contribution analysis
- Percentage calculation
- Error handling

### Twitter Integration Tests

Tests the Twitter integration, including:
- Getting mentions
- Parsing X messages
- Command extraction
- Error handling

## Troubleshooting

If you encounter issues with the tests:

1. Check that your `.env.local` file has all the required environment variables
2. Verify that your NEAR account has sufficient funds
3. Ensure your GitHub token has the necessary permissions
4. Check that your Twitter Cookie Auth credentials are valid
