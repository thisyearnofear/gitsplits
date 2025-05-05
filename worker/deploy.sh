#!/bin/bash

# Deploy script for GitSplits Worker Agent
# This script deploys the worker agent to the server

# Check if .env file exists
if [ ! -f .env ]; then
  echo "Error: .env file not found. Please create it first."
  exit 1
fi

# Build and start the Docker container
docker-compose down
docker-compose build
docker-compose up -d

# Wait for the worker agent to start
echo "Waiting for worker agent to start..."
sleep 5

# Check if the worker agent is running
if curl -s http://localhost:3001/api/health | grep -q "ok"; then
  echo "Worker agent is running."
else
  echo "Error: Worker agent failed to start."
  docker-compose logs
  exit 1
fi

# Register the worker agent with the NEAR contract
echo "Registering worker agent with NEAR contract..."
curl -X POST http://localhost:3001/api/register

echo "Deployment complete."
