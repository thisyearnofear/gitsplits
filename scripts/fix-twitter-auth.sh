#!/bin/bash

# Script to fix Twitter authentication issues

echo "GitSplits Twitter Authentication Fixer"
echo "====================================="
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "Error: Docker is not running. Please start Docker and try again."
  exit 1
fi

echo "Docker is running."
echo ""

# Step 1: Get fresh Twitter cookies
echo "Step 1: Getting fresh Twitter cookies"
echo "------------------------------------"
echo "Follow these steps to get your Twitter cookies:"
echo ""
echo "1. Open your browser and go to Twitter.com"
echo "2. Log in to your Twitter account (gitsplits)"
echo "3. Open developer tools (F12 or right-click > Inspect)"
echo "4. Go to the Application tab (Chrome) or Storage tab (Firefox)"
echo "5. Under Cookies, find twitter.com"
echo "6. Look for these cookies:"
echo "   - auth_token"
echo "   - ct0"
echo "   - guest_id (optional)"
echo ""
echo "Enter the values below:"
echo ""

read -p "auth_token: " auth_token
read -p "ct0: " ct0
read -p "guest_id (optional, press Enter to skip): " guest_id

echo ""
echo "Creating updated .env file with new cookie values..."

# Create a backup of the current .env file
cp worker/.env worker/.env.backup.$(date +%Y%m%d%H%M%S)

# Update the cookie values in the .env file
sed -i '' "s/TWITTER_COOKIES_AUTH_TOKEN=.*/TWITTER_COOKIES_AUTH_TOKEN=$auth_token/" worker/.env
sed -i '' "s/TWITTER_COOKIES_CT0=.*/TWITTER_COOKIES_CT0=$ct0/" worker/.env
sed -i '' "s/TWITTER_COOKIES_GUEST_ID=.*/TWITTER_COOKIES_GUEST_ID=$guest_id/" worker/.env

# Update the alternative cookie format
alt_cookies="[{\"key\":\"auth_token\",\"value\":\"$auth_token\",\"domain\":\".twitter.com\"},{\"key\":\"ct0\",\"value\":\"$ct0\",\"domain\":\".twitter.com\"}"
if [ ! -z "$guest_id" ]; then
  alt_cookies="$alt_cookies,{\"key\":\"guest_id\",\"value\":\"$guest_id\",\"domain\":\".twitter.com\"}"
fi
alt_cookies="$alt_cookies]"

sed -i '' "s|# TWITTER_COOKIES=.*|# TWITTER_COOKIES='$alt_cookies'|" worker/.env

echo "Cookie values updated in worker/.env"
echo ""

# Step 2: Test Twitter API endpoints
echo "Step 2: Testing Twitter API endpoints"
echo "-----------------------------------"
./test-twitter-endpoints.sh
echo ""

# Step 3: Test Twitter authentication
echo "Step 3: Testing Twitter authentication"
echo "-----------------------------------"
./test-twitter-auth.sh
echo ""

# Step 4: Update Docker container
echo "Step 4: Updating Docker container"
echo "-------------------------------"
echo "Stopping any existing worker container..."
docker stop gitsplits-worker 2>/dev/null || true
docker rm gitsplits-worker 2>/dev/null || true

echo "Building new Docker image..."
cd worker
docker build -t gitsplits-worker-agent:latest .

echo "Starting worker agent with new configuration..."
docker run -d --name gitsplits-worker -p 3001:3001 --env-file .env gitsplits-worker-agent:latest

echo "Checking if worker agent is running..."
docker ps | grep gitsplits-worker
if [ $? -ne 0 ]; then
  echo "Error: Worker agent is not running. Please check the logs."
  docker logs gitsplits-worker
  exit 1
fi

echo "Worker agent is running!"
echo ""

# Step 5: Test worker agent
echo "Step 5: Testing worker agent"
echo "-------------------------"
echo "Checking worker agent health..."
curl -s http://localhost:3001/api/health
echo ""

echo "Testing Twitter integration..."
curl -s http://localhost:3001/api/check-mentions
echo ""

echo "Done! Twitter authentication should now be working."
echo "To check the logs, run: docker logs -f gitsplits-worker"
echo "To stop the worker agent, run: docker stop gitsplits-worker && docker rm gitsplits-worker"
