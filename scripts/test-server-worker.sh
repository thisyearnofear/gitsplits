#!/bin/bash

# Script to test the worker agent on the server
# Usage: ./test-server-worker.sh "command"
# Example: ./test-server-worker.sh "github.com/near/near-sdk-rs"

COMMAND=${1:-"help"}

# Check if we can connect to the server
echo "Checking connection to gitsplits-server..."
if ! ssh -q gitsplits-server exit; then
  echo "Error: Cannot connect to gitsplits-server. Please check your SSH configuration."
  exit 1
fi

echo "Connection successful!"

# Check if the worker agent is running
echo "Checking if worker agent is running..."
ssh gitsplits-server "docker ps | grep gitsplits-worker"
if [ $? -ne 0 ]; then
  echo "Error: Worker agent is not running. Please check the logs."
  ssh gitsplits-server "docker logs gitsplits-worker"
  exit 1
fi

echo "Worker agent is running!"

# Check the worker agent health
echo "Checking worker agent health..."
ssh gitsplits-server "curl -s http://localhost:3001/api/health"
echo ""

# Test the command
echo "Testing command: @gitsplits ${COMMAND}"
ssh gitsplits-server "cd /opt/gitsplits/worker && ./test-commands.sh \"${COMMAND}\""

echo "Test completed!"
