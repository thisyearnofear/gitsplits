#!/bin/bash
# Script to add a function call access key for Crosspost using NEAR CLI

# Print header
echo "🔑 Add Function Call Access Key for Crosspost"
echo "==========================================="
echo

# Check if near-cli is installed
if ! command -v near &> /dev/null; then
  echo "❌ Error: near-cli is not installed."
  echo "Please install it by running: npm install -g near-cli"
  exit 1
fi

# Ask for the NEAR account ID
read -p "Enter your NEAR account ID (e.g., papajams.near): " ACCOUNT_ID

if [ -z "$ACCOUNT_ID" ]; then
  echo "❌ Error: NEAR account ID is required."
  exit 1
fi

# Confirm with the user
echo
echo "You are about to add a function call access key for:"
echo "Account ID: $ACCOUNT_ID"
echo "Contract: crosspost.near"
echo "This key will allow the account to call functions on the Crosspost contract."
echo
read -p "Do you want to continue? (y/n): " CONFIRM

if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
  echo "Operation cancelled."
  exit 0
fi

# First, make sure the user is logged in
echo
echo "Step 1: Logging in to NEAR..."
echo "You will be redirected to a web browser to authorize access to your NEAR account."
echo

near login --networkId mainnet

# Check if login was successful
if [ $? -ne 0 ]; then
  echo
  echo "❌ Error: Failed to log in to NEAR."
  echo "Please make sure you have access to the account and try again."
  exit 1
fi

# Generate a new key pair
echo
echo "Step 2: Adding a function call access key..."
echo "This will create a new key pair and add it to your account."
echo

# Create a temporary file for the key
KEY_FILE="crosspost-key-$(date +%s).json"

# Generate a random key pair
PRIVATE_KEY=$(openssl rand -hex 32)
PUBLIC_KEY=$(echo -n "$PRIVATE_KEY" | xxd -p -r | openssl dgst -sha256 -binary | openssl base64)

echo "Generated key pair:"
echo "Private key: $PRIVATE_KEY"
echo "Public key: $PUBLIC_KEY"

# Add the function call access key
echo
echo "Adding the function call access key to your account..."
echo "You will be redirected to a web browser to authorize this transaction."
echo

near add-key $ACCOUNT_ID "ed25519:$PUBLIC_KEY" --contract-id crosspost.near --allowance 0 --networkId mainnet

# Check if key addition was successful
if [ $? -ne 0 ]; then
  echo
  echo "❌ Error: Failed to add the function call access key."
  echo "Please make sure you have access to the account and try again."
  exit 1
fi

echo
echo "✅ Function Call Access Key added successfully."
echo
echo "Your CROSSPOST_KEYPAIR is: ed25519:$PRIVATE_KEY"
echo
echo "Next steps:"
echo "1. Update your .env.local file with the following:"
echo "   CROSSPOST_KEYPAIR=ed25519:$PRIVATE_KEY"
echo "   CROSSPOST_SIGNER_ID=$ACCOUNT_ID"
echo
echo "Note: Keep your secret keypair safe and do not share it with anyone!"
