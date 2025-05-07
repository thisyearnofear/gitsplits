#!/bin/bash

# Script to test the Farcaster webhook server locally

echo "Testing Farcaster webhook server locally..."

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
  echo "Error: ngrok is not installed. Please install ngrok and try again."
  echo "You can download it from https://ngrok.com/download"
  exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
  echo "Error: Node.js is not installed. Please install Node.js and try again."
  exit 1
fi

# Check if required packages are installed
if [ ! -d "node_modules/express" ] || [ ! -d "node_modules/axios" ] || [ ! -d "node_modules/body-parser" ]; then
  echo "Installing required packages..."
  npm install express axios body-parser dotenv
fi

# Check if .env file exists
if [ ! -f ".env.local" ]; then
  echo "Error: .env.local file not found. Please create a .env.local file with the required variables."
  echo "Required variables:"
  echo "  NEYNAR_API_KEY=your_neynar_api_key"
  echo "  NEYNAR_SIGNER_UUID=your_farcaster_signer_uuid"
  exit 1
fi

# Extract environment variables from .env.local
export NEYNAR_API_KEY=$(grep NEYNAR_API_KEY .env.local | cut -d '=' -f2)
# Remove any dashes and convert to lowercase for Neynar API key
export NEYNAR_API_KEY=$(echo $NEYNAR_API_KEY | tr -d '-' | tr '[:upper:]' '[:lower:]')
export NEYNAR_SIGNER_UUID=$(grep NEYNAR_SIGNER_UUID .env.local | cut -d '=' -f2)
export FARCASTER_WEBHOOK_PORT=3002

echo "Using Neynar API Key: ${NEYNAR_API_KEY}"
echo "Using Neynar Signer UUID: ${NEYNAR_SIGNER_UUID}"

# Start ngrok in the background
echo "Starting ngrok..."
ngrok http 3002 > /dev/null &
NGROK_PID=$!

# Wait for ngrok to start
echo "Waiting for ngrok to start..."
sleep 5

# Get the ngrok URL
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"[^"]*' | grep -o 'http[^"]*')

if [ -z "$NGROK_URL" ]; then
  echo "Error: Failed to get ngrok URL. Make sure ngrok is running correctly."
  kill $NGROK_PID
  exit 1
fi

echo "ngrok URL: $NGROK_URL"

# Update the webhook URL in the environment
export FARCASTER_WEBHOOK_URL="$NGROK_URL/webhook"
echo "Webhook URL: $FARCASTER_WEBHOOK_URL"

# Generate a webhook secret
export FARCASTER_WEBHOOK_SECRET=$(openssl rand -hex 32)
echo "Webhook secret: $FARCASTER_WEBHOOK_SECRET"

# Create a temporary .env file for the webhook server
cat > /tmp/farcaster.env << EOL
NEYNAR_API_KEY=$NEYNAR_API_KEY
NEYNAR_SIGNER_UUID=$NEYNAR_SIGNER_UUID
FARCASTER_WEBHOOK_URL=$FARCASTER_WEBHOOK_URL
FARCASTER_WEBHOOK_SECRET=$FARCASTER_WEBHOOK_SECRET
FARCASTER_WEBHOOK_PORT=$FARCASTER_WEBHOOK_PORT
EOL

# Start the webhook server in the background
echo "Starting webhook server..."
NODE_ENV=development node -r dotenv/config scripts/farcaster/webhook-server.js dotenv_config_path=/tmp/farcaster.env &
SERVER_PID=$!

# Wait for the server to start
echo "Waiting for webhook server to start..."
sleep 2

# Register the webhook with Neynar
echo "Registering webhook with Neynar..."
NODE_ENV=development node -r dotenv/config scripts/farcaster/register-webhook.js dotenv_config_path=/tmp/farcaster.env

echo ""
echo "Webhook server is running at $FARCASTER_WEBHOOK_URL"
echo "You can now test it by mentioning your bot (@snel) on Farcaster"
echo "Press Ctrl+C to stop the server when you're done"

# Wait for user to press Ctrl+C
trap "kill $SERVER_PID; kill $NGROK_PID; echo 'Stopped webhook server and ngrok'; exit 0" INT
wait $SERVER_PID
