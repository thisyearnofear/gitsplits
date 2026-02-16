#!/bin/bash

# Test GitSplits X Agent commands locally
# This script simulates Twitter mentions to test the worker agent

# Check if the worker agent is running
if ! curl -s http://localhost:3001/api/health > /dev/null; then
  echo "Error: Worker agent is not running"
  echo "Please start the worker agent with: ./run-local.sh"
  exit 1
fi

# Function to test a command
test_command() {
  local command="$1"
  echo ""
  echo "=== Testing command: $command ==="
  echo ""

  # Create a temporary directory if it doesn't exist
  mkdir -p tmp

  # Create a mock mention
  local tweet_id=$(date +%s%N | cut -b1-19)
  local mock_mention='{
    "id_str": "'$tweet_id'",
    "created_at": "'$(date -u +"%a %b %d %H:%M:%S %z %Y")'",
    "full_text": "@gitsplits '$command'",
    "user": {
      "id_str": "1234567890",
      "screen_name": "test_user",
      "name": "Test User"
    }
  }'

  # Save the mock mention to a temporary file
  local temp_file="tmp/mock-mention-$tweet_id.json"
  echo "$mock_mention" > "$temp_file"

  # Set the environment variable to point to this file
  export MOCK_MENTIONS_FILE="$temp_file"

  # Call the check-mentions endpoint
  curl -s http://localhost:3001/api/check-mentions | jq .

  # Clean up the temporary file
  rm "$temp_file"
  unset MOCK_MENTIONS_FILE

  echo ""
  echo "=== Command test completed ==="
  echo ""
}

# Check if jq is installed
if ! command -v jq &> /dev/null; then
  echo "Error: jq is not installed"
  echo "Please install jq with: brew install jq"
  exit 1
fi

# Check if a specific command was provided
if [ $# -gt 0 ]; then
  # Test the specified command
  test_command "$*"
else
  # Test all commands
  echo "Testing all commands..."

  # Help command
  test_command "help"

  # Analyze repository command
  test_command "github.com/near/near-sdk-rs"

  # Create split with default allocation
  test_command "create split github.com/near/near-sdk-rs default"

  # Create split with custom allocation
  test_command "create split github.com/near/near-sdk-rs 50/30/20"

  # View splits for a repository
  test_command "splits github.com/near/near-sdk-rs"

  # View split details
  test_command "split split-12345"

  # Legacy info command removed

  # Verify command
  test_command "verify papajams"

  # Distribute command
  test_command "distribute 5 NEAR to github.com/near/near-sdk-rs"

  echo "All tests completed"
fi
