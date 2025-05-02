#!/bin/bash

# Configuration
SERVER_USER="your-username"
SERVER_IP="your-server-ip"
SERVER_PATH="/path/to/deployment"
DOCKER_USERNAME="your-docker-username"
IMAGE_NAME="gitsplits-worker"
IMAGE_TAG="latest"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== GitSplits Worker Agent Deployment ===${NC}"

# Step 1: Check server status
echo -e "${YELLOW}Checking server status...${NC}"
ssh $SERVER_USER@$SERVER_IP "bash -s" < check_server.sh

# Ask for confirmation to proceed
read -p "Do you want to proceed with deployment? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo -e "${RED}Deployment cancelled.${NC}"
    exit 1
fi

# Step 2: Create deployment directory on server
echo -e "${YELLOW}Creating deployment directory on server...${NC}"
ssh $SERVER_USER@$SERVER_IP "mkdir -p $SERVER_PATH"

# Step 3: Copy worker files to server
echo -e "${YELLOW}Copying worker files to server...${NC}"
rsync -avz --exclude 'node_modules' --exclude '.git' worker/ $SERVER_USER@$SERVER_IP:$SERVER_PATH

# Step 4: Build and push Docker image on server
echo -e "${YELLOW}Building and pushing Docker image on server...${NC}"
ssh $SERVER_USER@$SERVER_IP "cd $SERVER_PATH && \
    docker build -t $DOCKER_USERNAME/$IMAGE_NAME:$IMAGE_TAG . && \
    docker push $DOCKER_USERNAME/$IMAGE_NAME:$IMAGE_TAG"

# Step 5: Get image hash
echo -e "${YELLOW}Getting image hash...${NC}"
IMAGE_HASH=$(ssh $SERVER_USER@$SERVER_IP "docker inspect $DOCKER_USERNAME/$IMAGE_NAME:$IMAGE_TAG | grep -m 1 '\"Id\":' | cut -d':' -f2 | cut -d'\"' -f2 | cut -d's' -f2 | cut -c 3-")
echo -e "${GREEN}Image hash: $IMAGE_HASH${NC}"

# Step 6: Create docker-compose.yaml with environment variables
echo -e "${YELLOW}Creating docker-compose.yaml for Phala Cloud...${NC}"
cat > phala_docker_compose.yaml << EOL
version: '3'
services:
  worker:
    image: $DOCKER_USERNAME/$IMAGE_NAME:$IMAGE_TAG@sha256:$IMAGE_HASH
    environment:
      # NEAR Configuration
      - NEAR_NETWORK_ID=testnet
      - NEAR_NODE_URL=https://rpc.testnet.near.org
      - NEAR_CONTRACT_ID=\${NEAR_CONTRACT_ID}
      - NEAR_WALLET_URL=https://wallet.testnet.near.org
      - NEAR_HELPER_URL=https://helper.testnet.near.org
      - NEAR_ACCOUNT_ID=\${NEAR_ACCOUNT_ID}
      - NEAR_PRIVATE_KEY=\${NEAR_PRIVATE_KEY}
      
      # GitHub Configuration
      - GITHUB_TOKEN=\${GITHUB_TOKEN}
      
      # Twitter Configuration (Cookie Auth)
      - TWITTER_AUTH_TOKEN=\${TWITTER_AUTH_TOKEN}
      - TWITTER_CT0=\${TWITTER_CT0}
      - TWITTER_SCREEN_NAME=\${TWITTER_SCREEN_NAME}
      - TWITTER_LAST_TIMESTAMP=\${TWITTER_LAST_TIMESTAMP}
      
      # Server Configuration
      - PORT=3001
      - NODE_ENV=production
    ports:
      - "3001:3001"
    restart: always
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:3001/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
EOL

echo -e "${GREEN}Deployment preparation completed!${NC}"
echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. Update the configuration in ${GREEN}phala_docker_compose.yaml${NC} with your environment variables"
echo -e "2. Deploy to Phala Cloud using the configuration in ${GREEN}phala_docker_compose.yaml${NC}"
echo -e "3. Register the worker agent with your NEAR contract by calling the ${GREEN}/api/register${NC} endpoint"
