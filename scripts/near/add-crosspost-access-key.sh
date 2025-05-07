#!/bin/bash
# Script to generate a Function Call Access Key (FCAK) for Crosspost using near-cli

# Print header
echo "🔑 Generate Function Call Access Key (FCAK) for Crosspost"
echo "========================================================"
echo

# Check if near-cli is installed
if ! command -v near &> /dev/null; then
  echo "❌ Error: near CLI is not installed."
  echo "Please install it by following the instructions at:"
  echo "https://github.com/near/near-cli"
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

# Generate the FCAK using the exact command from the documentation
echo
echo "Generating Function Call Access Key..."
echo "You may be prompted to sign the transaction with your NEAR wallet."
echo

# Ask for the public key
read -p "Enter your public key (e.g., ed25519:4ii6PBEuThmrkFz2mBZEhziUQZq8KNidVoBKZvBAuiTQ): " PUBLIC_KEY

if [ -z "$PUBLIC_KEY" ]; then
  echo "❌ Error: Public key is required."
  exit 1
fi

# Run the command with the public key
echo "Running command:"
echo "near add-key $ACCOUNT_ID $PUBLIC_KEY --contract-id crosspost.near --allowance 0 --networkId mainnet"
echo

near add-key $ACCOUNT_ID $PUBLIC_KEY --contract-id crosspost.near --allowance 0 --networkId mainnet

# Check if the command was successful
if [ $? -ne 0 ]; then
  echo
  echo "❌ Error: Failed to generate Function Call Access Key."
  echo "Please make sure you have access to the account and try again."
  exit 1
fi

echo
echo "✅ Function Call Access Key generated successfully."
echo
echo "Next steps:"
echo "1. Check your NEAR wallet for the new access key."
echo "2. Update your .env.local file with the following:"
echo "   CROSSPOST_SIGNER_ID=$ACCOUNT_ID"
echo
echo "Note: You'll need to use the private key associated with this access key."
echo "You can find it in your NEAR wallet or in your ~/.near-credentials directory."
