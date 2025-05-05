#!/bin/bash

# Script to run the worker agent locally with Docker

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "Error: Docker is not running. Please start Docker and try again."
  exit 1
fi

echo "Docker is running."

# Navigate to the worker directory
cd worker

# Build the Docker image
echo "Building Docker image..."
docker build -t gitsplits-worker-agent:local .

# Stop any existing container
echo "Stopping any existing worker container..."
docker-compose down

# Start the worker agent
echo "Starting worker agent..."
docker-compose up -d

# Check if the worker agent is running
echo "Checking if worker agent is running..."
docker ps | grep gitsplits-worker
if [ $? -ne 0 ]; then
  echo "Error: Worker agent is not running. Please check the logs."
  docker logs gitsplits-worker
  exit 1
fi

echo "Worker agent is running!"

# Check the worker agent health
echo "Checking worker agent health..."
curl -s http://localhost:3001/api/health
echo ""

# Test Twitter integration
echo "Testing Twitter integration..."
curl -s http://localhost:3001/api/check-mentions
echo ""

echo "Worker agent is running locally. You can access it at http://localhost:3001"
echo "To check the logs, run: docker logs -f gitsplits-worker"
echo "To stop the worker agent, run: cd worker && docker-compose down"
