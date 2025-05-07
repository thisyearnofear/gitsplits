#!/bin/bash

# Deploy the GitSplits application to the server
# This script deploys both the frontend and worker agent to the server

# Check if the server alias is defined
if [ -z "$1" ]; then
  echo "Error: Server alias not provided"
  echo "Usage: ./scripts/deploy.sh <server-alias>"
  echo "Example: ./scripts/deploy.sh gitsplits-server"
  exit 1
fi

SERVER_ALIAS=$1

# Check if the server is reachable
echo "Checking if server $SERVER_ALIAS is reachable..."
ssh -q $SERVER_ALIAS exit
if [ $? -ne 0 ]; then
  echo "Error: Server $SERVER_ALIAS is not reachable"
  exit 1
fi

echo "Server $SERVER_ALIAS is reachable"

# Create deployment directory on the server
echo "Creating deployment directory on the server..."
ssh $SERVER_ALIAS "mkdir -p /opt/gitsplits"

# Copy the application to the server
echo "Copying application to the server..."
rsync -avz --exclude 'node_modules' --exclude '.git' --exclude '.next' --exclude 'worker/node_modules' . $SERVER_ALIAS:/opt/gitsplits/

# Copy the environment file to the server
echo "Copying environment file to the server..."
scp .env.local $SERVER_ALIAS:/opt/gitsplits/

# Set up the server environment
echo "Setting up the server environment..."
ssh $SERVER_ALIAS "cd /opt/gitsplits && ./scripts/setup-server-env.sh"

# Deploy the application
echo "Deploying the application..."
ssh $SERVER_ALIAS "cd /opt/gitsplits && docker-compose down && docker-compose up -d"

# Check the status of the application
echo "Checking the status of the application..."
ssh $SERVER_ALIAS "cd /opt/gitsplits && docker-compose ps"

echo "Deployment completed successfully"
