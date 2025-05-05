#!/bin/bash

# Script to help extract Twitter cookies from browser

echo "Twitter Cookie Extraction Helper"
echo "================================"
echo ""
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
cp worker/.env worker/.env.backup

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
echo "Testing Twitter authentication with new cookies..."
echo ""

# Run the test script
./test-twitter-auth.sh
