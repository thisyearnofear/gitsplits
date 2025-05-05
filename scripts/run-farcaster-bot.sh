#!/bin/bash

# Script to run the Farcaster bot locally

echo "Starting Farcaster bot webhook server..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
  echo "Error: Node.js is not installed. Please install Node.js and try again."
  exit 1
fi

# Check if required packages are installed
if [ ! -d "node_modules/express" ] || [ ! -d "node_modules/axios" ] || [ ! -d "node_modules/body-parser" ]; then
  echo "Installing required packages..."
  npm install express axios body-parser
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
  echo "Error: .env file not found. Please create a .env file with the required variables."
  echo "Required variables:"
  echo "  NEYNAR_API_KEY=your_neynar_api_key"
  echo "  FARCASTER_SIGNER_UUID=your_farcaster_signer_uuid"
  echo "  FARCASTER_WEBHOOK_SECRET=your_webhook_secret"
  echo "  FARCASTER_WEBHOOK_PORT=3002"
  exit 1
fi

# Check if webhook server script exists
if [ ! -f "scripts/farcaster/webhook-server.js" ]; then
  echo "Error: webhook-server.js not found. Please make sure the script exists."
  exit 1
fi

# Start the webhook server
node scripts/farcaster/webhook-server.js
