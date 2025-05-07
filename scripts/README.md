# GitSplits Scripts

This directory contains scripts for deploying, managing, and testing the GitSplits application. The scripts are organized into subdirectories by functionality.

## Directory Structure

- `deployment/`: Scripts for deploying the application to various environments
- `server/`: Scripts for managing and interacting with the GitSplits server
- `worker/`: Scripts for managing and running the GitSplits worker agent
- `twitter/`: Scripts for working with Twitter API and authentication
- `farcaster/`: Scripts for working with Farcaster integration
- `near/`: Scripts for working with NEAR blockchain and Crosspost integration
- `crosspost-tests/`: Scripts for testing Crosspost integration for Twitter posting
- `twitter-tests/`: Test scripts for various Twitter functionality

## Main Scripts

- `run-local.sh`: Main script to run the application locally

## Test Directories

### Crosspost Tests

The `crosspost-tests` directory contains scripts for testing Crosspost integration:

- `tweet-with-env.js`: Uses environment variables to post a tweet using Crosspost
- `tweet-crosspost.js`: Interactive script for posting tweets with Crosspost
- `tweet-direct.js`: Simple script that directly uses the Crosspost API

### Twitter Tests

The `twitter-tests` directory contains test scripts organized into subdirectories:

- `twitter-api/`: Tests for Twitter API functionality
- `masa/`: Tests for Masa API integration
- `crosspost/`: Tests for Crosspost integration
- `integration/`: Tests for integrated functionality

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
