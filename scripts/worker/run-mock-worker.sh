#!/bin/bash

# Script to run the worker agent locally with Docker in mock mode

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "Error: Docker is not running. Please start Docker and try again."
  exit 1
fi

echo "Docker is running."

# Navigate to the worker directory
cd worker

# Make sure mock mode is enabled
grep -q "USE_MOCK_TWITTER=true" .env || (
  echo "Enabling mock mode in .env file..."
  sed -i '' 's/USE_MOCK_TWITTER=false/USE_MOCK_TWITTER=true/g' .env
)

# Build the Docker image
echo "Building Docker image..."
docker build -t gitsplits-worker-agent:mock .

# Stop any existing container
echo "Stopping any existing worker container..."
docker stop gitsplits-worker 2>/dev/null || true
docker rm gitsplits-worker 2>/dev/null || true

# Start the worker agent
echo "Starting worker agent in mock mode..."
docker run -d --name gitsplits-worker -p 3001:3001 --env-file .env gitsplits-worker-agent:mock

# Check if the worker agent is running
echo "Checking if worker agent is running..."
docker ps | grep gitsplits-worker
if [ $? -ne 0 ]; then
  echo "Error: Worker agent is not running. Please check the logs."
  docker logs gitsplits-worker
  exit 1
fi

echo "Worker agent is running in mock mode!"

# Check the worker agent health
echo "Checking worker agent health..."
curl -s http://localhost:3001/api/health
echo ""

# Test Twitter integration
echo "Testing Twitter integration (mock mode)..."
curl -s http://localhost:3001/api/check-mentions
echo ""

echo "Worker agent is running locally in mock mode. You can access it at http://localhost:3001"
echo "To check the logs, run: docker logs -f gitsplits-worker"
echo "To stop the worker agent, run: docker stop gitsplits-worker && docker rm gitsplits-worker"
