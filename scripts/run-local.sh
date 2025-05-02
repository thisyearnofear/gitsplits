#!/bin/bash

# Run the GitSplits application locally
# This script sets up the environment and runs both the frontend and worker agent

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

# Create logs directory if it doesn't exist
mkdir -p logs
mkdir -p worker/logs

# Run the worker agent in the background
echo "Starting GitSplits Worker Agent..."
echo "NEAR Account: $NEAR_ACCOUNT_ID"
echo "NEAR Network: $NEAR_NETWORK_ID"
echo "NEAR Contract: $NEAR_CONTRACT_ID"
echo "GitHub Token: ${GITHUB_TOKEN:0:4}...${GITHUB_TOKEN: -4}"
echo "Twitter Screen Name: $TWITTER_SCREEN_NAME"

cd worker
npx nodemon index.js > ../logs/worker.log 2>&1 &
WORKER_PID=$!
cd ..

echo "Worker Agent started with PID: $WORKER_PID"
echo "Worker logs are being written to logs/worker.log"

# Run the frontend
echo "Starting GitSplits Frontend..."
echo "NEXT_PUBLIC_APP_URL: $NEXT_PUBLIC_APP_URL"
echo "NEXT_PUBLIC_contractId: $NEXT_PUBLIC_contractId"

npm run dev > logs/frontend.log 2>&1 &
FRONTEND_PID=$!

echo "Frontend started with PID: $FRONTEND_PID"
echo "Frontend logs are being written to logs/frontend.log"

# Function to handle script termination
function cleanup {
  echo "Stopping GitSplits application..."
  kill $WORKER_PID
  kill $FRONTEND_PID
  echo "Application stopped"
}

# Register the cleanup function to be called on exit
trap cleanup EXIT

# Wait for user input
echo ""
echo "GitSplits application is running"
echo "Press Ctrl+C to stop"
echo ""

# Keep the script running
wait
