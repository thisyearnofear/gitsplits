#!/bin/bash

# Script to deploy the Farcaster webhook server to the Hetzner server

echo "Deploying Farcaster webhook server to Hetzner server..."

# Check if SSH alias is set up
if ! ssh -q gitsplits-server exit; then
  echo "Error: SSH connection to gitsplits-server failed. Make sure your SSH alias is set up correctly."
  exit 1
fi

# Create the directory structure on the server
echo "Creating directory structure on the server..."
ssh gitsplits-server "mkdir -p /opt/gitsplits/farcaster"

# Copy the webhook server files to the server
echo "Copying webhook server files to the server..."
scp scripts/farcaster/webhook-server.js gitsplits-server:/opt/gitsplits/farcaster/
scp scripts/farcaster/README.md gitsplits-server:/opt/gitsplits/farcaster/

# Create a package.json file for the webhook server
echo "Creating package.json file for the webhook server..."
cat > /tmp/package.json << 'EOL'
{
  "name": "gitsplits-farcaster-webhook",
  "version": "1.0.0",
  "description": "Webhook server for GitSplits Farcaster bot",
  "main": "webhook-server.js",
  "scripts": {
    "start": "node webhook-server.js"
  },
  "dependencies": {
    "axios": "^1.6.0",
    "body-parser": "^1.20.2",
    "dotenv": "^16.3.1",
    "express": "^4.18.2"
  }
}
EOL
scp /tmp/package.json gitsplits-server:/opt/gitsplits/farcaster/

# Create a systemd service file for the webhook server
echo "Creating systemd service file for the webhook server..."
cat > /tmp/gitsplits-farcaster.service << 'EOL'
[Unit]
Description=GitSplits Farcaster Webhook Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/gitsplits/farcaster
ExecStart=/usr/bin/node webhook-server.js
Restart=on-failure
Environment=NODE_ENV=production
EnvironmentFile=/opt/gitsplits/farcaster/.env

[Install]
WantedBy=multi-user.target
EOL
scp /tmp/gitsplits-farcaster.service gitsplits-server:/tmp/

# Create a .env file for the webhook server
echo "Creating .env file for the webhook server..."
cat > /tmp/farcaster.env << EOL
# Neynar API configuration
NEYNAR_API_KEY=${NEYNAR_API_KEY}
NEYNAR_SIGNER_UUID=${NEYNAR_SIGNER_UUID}
FARCASTER_WEBHOOK_SECRET=${FARCASTER_WEBHOOK_SECRET}
FARCASTER_WEBHOOK_PORT=3002
EOL
scp /tmp/farcaster.env gitsplits-server:/opt/gitsplits/farcaster/.env

# Install dependencies and set up the service on the server
echo "Setting up the webhook server on the server..."
ssh gitsplits-server << 'EOL'
cd /opt/gitsplits/farcaster
npm install
sudo mv /tmp/gitsplits-farcaster.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable gitsplits-farcaster
sudo systemctl restart gitsplits-farcaster
sudo systemctl status gitsplits-farcaster
EOL

echo "Deployment completed!"
echo "The webhook server is now running on your Hetzner server."
echo "You can check the status with: ssh gitsplits-server 'sudo systemctl status gitsplits-farcaster'"
echo "You can view the logs with: ssh gitsplits-server 'sudo journalctl -u gitsplits-farcaster -f'"

# Get the server's public IP address
SERVER_IP=$(ssh gitsplits-server "curl -s ifconfig.me")
echo "Your webhook URL is: http://${SERVER_IP}:3002/webhook"
echo "Please update your .env.local file with this URL as FARCASTER_WEBHOOK_URL"
echo "Then run: node scripts/farcaster/register-webhook.js to register the webhook with Neynar"
