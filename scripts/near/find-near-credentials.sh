#!/bin/bash
# Script to find NEAR credentials for a specific account

# Print header
echo "🔍 Find NEAR Credentials"
echo "======================="
echo

# Ask for the NEAR account ID
read -p "Enter your NEAR account ID (e.g., papajams.near): " ACCOUNT_ID

if [ -z "$ACCOUNT_ID" ]; then
  echo "❌ Error: NEAR account ID is required."
  exit 1
fi

# Check if the credentials directory exists
CREDS_DIR="$HOME/.near-credentials/mainnet"
if [ ! -d "$CREDS_DIR" ]; then
  echo "❌ Error: NEAR credentials directory not found at $CREDS_DIR"
  echo "Please make sure you have logged in to NEAR CLI."
  exit 1
fi

# Check if the account credentials file exists
CREDS_FILE="$CREDS_DIR/$ACCOUNT_ID.json"
if [ ! -f "$CREDS_FILE" ]; then
  echo "❌ Error: Credentials file for $ACCOUNT_ID not found at $CREDS_FILE"
  
  # List all available credentials
  echo
  echo "Available credentials:"
  ls -1 "$CREDS_DIR"
  
  exit 1
fi

# Display the credentials
echo
echo "Found credentials for $ACCOUNT_ID:"
echo

# Extract and display the private key
PRIVATE_KEY=$(cat "$CREDS_FILE" | grep private_key | cut -d'"' -f4)
echo "Private Key: $PRIVATE_KEY"
echo

# Extract and display the public key
PUBLIC_KEY=$(cat "$CREDS_FILE" | grep public_key | cut -d'"' -f4)
echo "Public Key: $PUBLIC_KEY"
echo

# Check for function call access keys
echo "Checking for function call access keys..."
echo

# Use NEAR CLI to list keys
near keys $ACCOUNT_ID --networkId mainnet

echo
echo "To use this key with Crosspost, update your .env.local file with:"
echo "CROSSPOST_KEYPAIR=$PRIVATE_KEY"
echo "CROSSPOST_SIGNER_ID=$ACCOUNT_ID"
echo
echo "Note: Keep your private key safe and do not share it with anyone!"
