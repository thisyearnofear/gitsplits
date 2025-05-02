#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting manual deployment process...${NC}"

# Change to the project directory
cd /opt/gitsplits

# Pull the latest changes
echo -e "\n${YELLOW}Pulling latest changes from GitHub...${NC}"
if ! git pull origin main; then
    echo -e "${RED}Failed to pull changes${NC}"
    exit 1
fi

# Stop and remove existing containers
echo -e "\n${YELLOW}Stopping existing containers...${NC}"
docker-compose down

# Rebuild and start containers
echo -e "\n${YELLOW}Rebuilding and starting containers...${NC}"
if docker-compose up -d --build; then
    echo -e "\n${GREEN}Deployment successful!${NC}"
    echo -e "${YELLOW}You can check the application status using docker-compose ps${NC}"
else
    echo -e "\n${RED}Deployment failed${NC}"
    exit 1
fi 