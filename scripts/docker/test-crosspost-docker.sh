#!/bin/bash
# Test script for running the GitSplits worker agent with Crosspost in Docker

# Set default values
CONTRACT_ID="crosspost.near"
DOCKER_IMAGE="gitsplits-worker-agent"
CONTAINER_NAME="gitsplits-worker-test"

# Print header
echo "🚀 GitSplits Worker Agent with Crosspost Docker Test"
echo "======================================================"
echo

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "❌ Error: Docker is not running. Please start Docker and try again."
  exit 1
fi

# Ask for contract ID
read -p "Enter the Crosspost contract ID (default: $CONTRACT_ID): " input_contract_id
CONTRACT_ID=${input_contract_id:-$CONTRACT_ID}

# Create a temporary Dockerfile
echo "Creating temporary Dockerfile..."
cat > Dockerfile.test << EOF
FROM node:18-alpine

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./
COPY worker/package*.json ./worker/

# Install dependencies
RUN npm install
RUN cd worker && npm install

# Copy the rest of the application
COPY . .

# Set environment variables
ENV CROSSPOST_CONTRACT_ID=$CONTRACT_ID
ENV USE_CROSSPOST_FOR_TWEETS=true
ENV USE_MASA_FOR_MENTIONS=true

# Expose port
EXPOSE 3001

# Start the worker agent
CMD ["node", "worker/src/index.js"]
EOF

# Build the Docker image
echo "Building Docker image..."
docker build -t $DOCKER_IMAGE -f Dockerfile.test .

# Check if the build was successful
if [ $? -ne 0 ]; then
  echo "❌ Error: Failed to build Docker image."
  rm Dockerfile.test
  exit 1
fi

# Check if the container already exists
if docker ps -a | grep -q $CONTAINER_NAME; then
  echo "Container $CONTAINER_NAME already exists. Removing it..."
  docker rm -f $CONTAINER_NAME
fi

# Run the Docker container
echo "Running Docker container..."
docker run -d --name $CONTAINER_NAME \
  -p 3001:3001 \
  --env-file .env.local \
  -e CROSSPOST_CONTRACT_ID=$CONTRACT_ID \
  -e USE_CROSSPOST_FOR_TWEETS=true \
  -e USE_MASA_FOR_MENTIONS=true \
  $DOCKER_IMAGE

# Check if the container is running
if ! docker ps | grep -q $CONTAINER_NAME; then
  echo "❌ Error: Failed to start Docker container."
  docker logs $CONTAINER_NAME
  rm Dockerfile.test
  exit 1
fi

echo "✅ Docker container started successfully."
echo "Container ID: $(docker ps -q -f name=$CONTAINER_NAME)"
echo

# Show container logs
echo "Container logs:"
echo "==============="
docker logs -f $CONTAINER_NAME &
LOGS_PID=$!

# Wait for user to press Ctrl+C
echo
echo "Press Ctrl+C to stop the container and exit."
trap "kill $LOGS_PID; docker stop $CONTAINER_NAME; echo; echo 'Container stopped.'; rm Dockerfile.test; exit 0" INT
wait $LOGS_PID
