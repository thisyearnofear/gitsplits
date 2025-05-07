#!/bin/bash
# Script to generate a new NEAR key pair

# Print header
echo "🔑 Generate NEAR Key Pair"
echo "======================="
echo

# Generate a new key pair using near CLI
echo "Generating a new key pair..."
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
echo
echo "You can use this public key with the add-crosspost-access-key.sh script."
echo "After adding the access key, update your .env.local file with:"
echo "CROSSPOST_KEYPAIR=$PRIVATE_KEY"
echo "CROSSPOST_SIGNER_ID=your-account-id"
echo
echo "Note: Keep your private key safe and do not share it with anyone!"
echo
echo "The key has been saved to $KEY_FILE for backup purposes."
echo "You may want to delete this file after updating your .env.local file."
