#!/bin/bash

# Run the GitSplits Worker Agent locally
# This script sets up the environment and runs the worker agent

# Check if .env.local exists
if [ ! -f .env.local ]; then
  echo "Error: .env.local file not found"
  echo "Please create a .env.local file based on .env.example"
  exit 1
fi

# Load environment variables from .env.local
export $(grep -v '^#' .env.local | xargs)

# Check required environment variables
if [ -z "$NEAR_PRIVATE_KEY" ]; then
  echo "Error: NEAR_PRIVATE_KEY is not defined in .env.local"
  exit 1
fi

if [ -z "$NEAR_ACCOUNT_ID" ]; then
  echo "Error: NEAR_ACCOUNT_ID is not defined in .env.local"
  exit 1
fi

if [ -z "$GITHUB_TOKEN" ]; then
  echo "Error: GITHUB_TOKEN is not defined in .env.local"
  exit 1
fi

# Run the worker agent
echo "Starting GitSplits Worker Agent..."
echo "NEAR Account: $NEAR_ACCOUNT_ID"
echo "NEAR Network: $NEAR_NETWORK_ID"
echo "NEAR Contract: $NEAR_CONTRACT_ID"
echo "GitHub Token: ${GITHUB_TOKEN:0:4}...${GITHUB_TOKEN: -4}"
echo "Twitter Screen Name: $TWITTER_SCREEN_NAME"

# Run with nodemon for auto-restart on file changes
npx nodemon index.js
