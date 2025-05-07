#!/bin/bash
# Script to add a function call access key for Crosspost using the exact command from the documentation

# Print header
echo "🔑 Add Function Call Access Key for Crosspost"
echo "==========================================="
echo

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

# Run the exact command from the documentation
echo
echo "Running the exact command from the documentation:"
echo "near account add-key $ACCOUNT_ID grant-function-call-access --allowance '1 NEAR' --contract-account-id crosspost.near --function-names '' autogenerate-new-keypair print-to-terminal network-config mainnet sign-with-keychain send"
echo
echo "This command will:"
echo "1. Generate a new key pair"
echo "2. Add it as a function call access key to your account"
echo "3. Print the key pair to the terminal"
echo
echo "You may be prompted to sign the transaction with your NEAR wallet."
echo

# Run the command
near account add-key $ACCOUNT_ID grant-function-call-access --allowance '1 NEAR' --contract-account-id crosspost.near --function-names '' autogenerate-new-keypair print-to-terminal network-config mainnet sign-with-keychain send

# Check if the command was successful
if [ $? -ne 0 ]; then
  echo
  echo "❌ Error: Failed to add the function call access key."
  echo "Please make sure you have access to the account and try again."
  exit 1
fi

echo
echo "✅ Function Call Access Key added successfully."
echo
echo "Please copy the SECRET KEYPAIR from above (it starts with 'ed25519:')."
echo
echo "Next steps:"
echo "1. Update your .env.local file with the following:"
echo "   CROSSPOST_KEYPAIR=<your-secret-keypair>"
echo "   CROSSPOST_SIGNER_ID=$ACCOUNT_ID"
echo
echo "Note: Keep your secret keypair safe and do not share it with anyone!"
