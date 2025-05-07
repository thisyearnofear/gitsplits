#!/bin/bash
# Script to generate a Function Call Access Key (FCAK) for Crosspost

# Print header
echo "🔑 Generate Function Call Access Key (FCAK) for Crosspost"
echo "========================================================"
echo

# Check if near-cli-rs is installed
if ! command -v near &> /dev/null; then
  echo "❌ Error: near-cli-rs is not installed."
  echo "Please install it by following the instructions at:"
  echo "https://github.com/near/near-cli-rs"
  exit 1
fi

# Ask for the NEAR account ID
read -p "Enter your NEAR account ID (e.g., gitsplits-worker.papajams.near): " ACCOUNT_ID

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

# Generate the FCAK
echo
echo "Generating Function Call Access Key..."
echo "You may be prompted to sign the transaction with your NEAR wallet."
echo

# Run the near-cli-rs command
near account add-key $ACCOUNT_ID grant-function-call-access \
  --allowance '0 NEAR' \
  --contract-account-id crosspost.near \
  --function-names '' \
  autogenerate-new-keypair \
  print-to-terminal \
  network-config mainnet \
  sign-with-keychain \
  send

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
echo "1. Copy the SECRET KEYPAIR from above (it starts with 'ed25519:')."
echo "2. Update your .env.local file with the following:"
echo "   CROSSPOST_KEYPAIR=<your-secret-keypair>"
echo "   CROSSPOST_SIGNER_ID=$ACCOUNT_ID"
echo
echo "Note: Keep your secret keypair safe and do not share it with anyone!"
