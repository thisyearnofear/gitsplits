#!/bin/bash
# Script to set up Crosspost for GitSplits

# Print header
echo "🚀 Set up Crosspost for GitSplits"
echo "==============================="
echo

# Check if near-cli is installed
if ! command -v near &> /dev/null; then
  echo "❌ Error: near CLI is not installed."
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
echo "You are about to set up Crosspost for:"
echo "Account ID: $ACCOUNT_ID"
echo "This will:"
echo "1. Generate a new key pair"
echo "2. Add a function call access key to your account for the crosspost.near contract"
echo "3. Update your .env.local file with the new key pair"
echo
read -p "Do you want to continue? (y/n): " CONFIRM

if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
  echo "Operation cancelled."
  exit 0
fi

# Step 1: Generate a new key pair
echo
echo "Step 1: Generating a new key pair..."
echo

# Create a temporary file name
TEMP_FILE="near-key-$(date +%s).json"

# Generate the key pair
near generate-key $TEMP_FILE --networkId mainnet

# Check if the command was successful
if [ $? -ne 0 ]; then
  echo
  echo "❌ Error: Failed to generate key pair."
  exit 1
fi

# Extract the public and private keys
if [ -f "$TEMP_FILE.json" ]; then
  # The file exists with .json extension
  KEY_FILE="$TEMP_FILE.json"
elif [ -f "$TEMP_FILE" ]; then
  # The file exists without .json extension
  KEY_FILE="$TEMP_FILE"
else
  # Try to find the file
  KEY_FILE=$(find . -name "$TEMP_FILE*" | head -n 1)
  
  if [ -z "$KEY_FILE" ]; then
    echo
    echo "❌ Error: Could not find the generated key file."
    exit 1
  fi
fi

# Extract the keys
PUBLIC_KEY=$(cat "$KEY_FILE" | grep public_key | cut -d'"' -f4)
PRIVATE_KEY=$(cat "$KEY_FILE" | grep private_key | cut -d'"' -f4)

# Display the keys
echo
echo "✅ Key pair generated successfully:"
echo
echo "Public Key: $PUBLIC_KEY"
echo "Private Key: $PRIVATE_KEY"

# Step 2: Add the function call access key
echo
echo "Step 2: Adding the function call access key..."
echo
echo "You will be redirected to a web browser to authorize this transaction."
echo

# Run the command with the public key
echo "Running command:"
echo "near add-key $ACCOUNT_ID $PUBLIC_KEY --contract-id crosspost.near --allowance 0 --networkId mainnet"
echo

near add-key $ACCOUNT_ID $PUBLIC_KEY --contract-id crosspost.near --allowance 0 --networkId mainnet

# Check if the command was successful
if [ $? -ne 0 ]; then
  echo
  echo "❌ Error: Failed to add the function call access key."
  echo "Please make sure you have access to the account and try again."
  exit 1
fi

# Step 3: Update the .env.local file
echo
echo "Step 3: Updating the .env.local file..."
echo

# Check if the .env.local file exists
if [ ! -f ".env.local" ]; then
  echo "❌ Error: .env.local file not found."
  echo "Please create the file and try again."
  exit 1
fi

# Update the .env.local file
sed -i '' "s/CROSSPOST_KEYPAIR=.*/CROSSPOST_KEYPAIR=$PRIVATE_KEY/" .env.local
sed -i '' "s/CROSSPOST_SIGNER_ID=.*/CROSSPOST_SIGNER_ID=$ACCOUNT_ID/" .env.local
sed -i '' "s/NEAR_ACCOUNT_ID=.*/NEAR_ACCOUNT_ID=$ACCOUNT_ID/" .env.local
sed -i '' "s/NEAR_PRIVATE_KEY=.*/NEAR_PRIVATE_KEY=$PRIVATE_KEY/" .env.local
sed -i '' "s/BOT_TWITTER_USER_ID=.*/BOT_TWITTER_USER_ID=1917926180847755264/" .env.local

echo
echo "✅ .env.local file updated successfully."
echo

# Step 4: Test the Crosspost integration
echo
echo "Step 4: Testing the Crosspost integration..."
echo
read -p "Do you want to test the Crosspost integration now? (y/n): " TEST_CONFIRM

if [ "$TEST_CONFIRM" == "y" ] || [ "$TEST_CONFIRM" == "Y" ]; then
  echo
  echo "Running the test script..."
  echo
  node scripts/twitter-tests/test-crosspost-simple.js
else
  echo
  echo "Skipping the test."
  echo
  echo "You can run the test later with:"
  echo "node scripts/twitter-tests/test-crosspost-simple.js"
fi

echo
echo "✅ Crosspost setup completed successfully."
echo
echo "Next steps:"
echo "1. Make sure your Twitter account is connected to your NEAR account at opencrosspost.com"
echo "2. Test the Crosspost integration with: node scripts/twitter-tests/test-crosspost-simple.js"
echo "3. Test the worker agent with: node scripts/twitter-tests/test-worker-crosspost.js"
echo
echo "Note: Keep your private key safe and do not share it with anyone!"
echo
echo "The key has been saved to $KEY_FILE for backup purposes."
echo "You may want to delete this file after verifying that everything works."
