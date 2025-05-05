#!/bin/bash

# Script to test Twitter authentication without Docker

# Navigate to the worker directory
cd worker

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Run the test script
echo "Testing Twitter authentication..."
node test-twitter-auth.js
