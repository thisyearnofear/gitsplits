#!/bin/bash
# Script to generate a Function Call Access Key for Crosspost using standard near-cli

# Print header
echo "🔑 Generate Function Call Access Key for Crosspost"
echo "=================================================="
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
echo "You are about to generate a Function Call Access Key for:"
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
echo "Step 2: Generating a new key pair..."
KEY_FILE="crosspost-key-$(date +%s).json"
near generate-key $KEY_FILE --networkId mainnet

# Check if key generation was successful
if [ $? -ne 0 ]; then
  echo
  echo "❌ Error: Failed to generate a new key pair."
  exit 1
fi

# Extract the public key from the generated key file
PUBLIC_KEY=$(cat $KEY_FILE | grep public_key | cut -d'"' -f4)
PRIVATE_KEY=$(cat $KEY_FILE | grep private_key | cut -d'"' -f4)

# Add the function call access key
echo
echo "Step 3: Adding the function call access key to your account..."
echo "You will be redirected to a web browser to authorize this transaction."
echo

near add-key $ACCOUNT_ID $PUBLIC_KEY --contract-id crosspost.near --allowance 0 --networkId mainnet

# Check if key addition was successful
if [ $? -ne 0 ]; then
  echo
  echo "❌ Error: Failed to add the function call access key."
  echo "Please make sure you have access to the account and try again."
  rm $KEY_FILE
  exit 1
fi

echo
echo "✅ Function Call Access Key generated and added successfully."
echo
echo "Your CROSSPOST_KEYPAIR is: $PRIVATE_KEY"
echo
echo "Next steps:"
echo "1. Update your .env.local file with the following:"
echo "   CROSSPOST_KEYPAIR=$PRIVATE_KEY"
echo "   CROSSPOST_SIGNER_ID=$ACCOUNT_ID"
echo
echo "Note: Keep your secret keypair safe and do not share it with anyone!"
echo
echo "The key has been saved to $KEY_FILE for backup purposes."
echo "You may want to delete this file after updating your .env.local file."
