# GitSplits Scripts

This directory contains scripts for deploying, managing, and testing the GitSplits application.

## Deployment Scripts

- `check_server.sh`: Script to check the status of the server
- `deploy_to_hetzner.sh`: Script to deploy the application to the Hetzner server
- `deploy-to-server.sh`: Script to deploy the application to the server
- `pull-and-deploy.sh`: Script to pull the latest changes and deploy them
- `setup-server-env.sh`: Script to set up the server environment variables
- `test-server-worker.sh`: Script to test the worker agent on the server
- `update-worker.sh`: Script to update the worker agent on the server

## Worker Scripts

- `run-local-worker.sh`: Script to run the worker agent locally
- `run-mock-worker.sh`: Script to run the worker agent with mock Twitter data

## Twitter Scripts

- `get-twitter-cookies.sh`: Helper script to extract Twitter cookies from your browser
- `fix-twitter-auth.sh`: Comprehensive script to fix Twitter authentication issues
- `test-twitter-auth.sh`: Script to test Twitter authentication
- `test-twitter-endpoints.sh`: Script to test different Twitter API endpoints

## Twitter Test Scripts

The `twitter-tests` directory contains JavaScript test scripts for testing various aspects of the Twitter integration:

- `test-account-info.js`: Tests getting account information
- `test-different-screen-name.js`: Tests using a different screen name
- `test-mentions-timeline.js`: Tests getting mentions timeline
- `test-post-tweet.js`: Tests posting a tweet
- `test-search-33bitsAnon.js`: Tests searching for tweets mentioning @33bitsAnon
- `test-search-tweets.js`: Tests searching for tweets
- `test-search-without-at.js`: Tests searching for tweets without @ symbol
- `test-twitter-login.js`: Tests Twitter login information
- `test-user-info.js`: Tests getting user information
- `test-user-timeline.js`: Tests getting user timeline

## Usage

### Checking Server Status

```bash
./check_server.sh
```

### Deploying to Hetzner

```bash
./deploy_to_hetzner.sh
```

### Pulling and Deploying

```bash
./pull-and-deploy.sh
```

### Setting Up Server Environment

```bash
./setup-server-env.sh
```

## Notes

These scripts are designed to be run from the root directory of the project. Make sure you have the necessary permissions and SSH access configured before running them.
