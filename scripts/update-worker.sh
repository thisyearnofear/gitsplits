#!/bin/bash

# Script to update and deploy the worker agent to the Hetzner server

# Check if we can connect to the server
echo "Checking connection to gitsplits-server..."
if ! ssh -q gitsplits-server exit; then
  echo "Error: Cannot connect to gitsplits-server. Please check your SSH configuration."
  exit 1
fi

echo "Connection successful!"

# Test GitHub token locally first
echo "Testing GitHub token locally..."
cd worker
node test-github-token.js
if [ $? -ne 0 ]; then
  echo "Error: GitHub token test failed. Please check your GITHUB_TOKEN."
  exit 1
fi
cd ..

echo "GitHub token is working correctly!"

# Update the worker agent on the server
echo "Updating worker agent on the server..."
ssh gitsplits-server "cd /opt/gitsplits && git pull"

# Copy the .env file to the server if it doesn't exist
echo "Checking if .env file exists on the server..."
if ! ssh gitsplits-server "test -f /opt/gitsplits/worker/.env"; then
  echo "Creating .env file on the server..."
  scp worker/.env gitsplits-server:/opt/gitsplits/worker/.env
fi

# Deploy the worker agent
echo "Deploying worker agent..."
ssh gitsplits-server "cd /opt/gitsplits/worker && docker-compose down && docker-compose up -d"

# Check if the worker agent is running
echo "Checking if worker agent is running..."
ssh gitsplits-server "docker ps | grep gitsplits-worker"
if [ $? -ne 0 ]; then
  echo "Error: Worker agent is not running. Please check the logs."
  ssh gitsplits-server "docker logs gitsplits-worker"
  exit 1
fi

echo "Worker agent is running!"

# Check the worker agent health
echo "Checking worker agent health..."
ssh gitsplits-server "curl -s http://localhost:3001/api/health"

# Register the worker agent with the NEAR contract
echo "Registering worker agent with NEAR contract..."
ssh gitsplits-server "curl -s -X POST http://localhost:3001/api/register"

echo "Worker agent updated and deployed successfully!"
