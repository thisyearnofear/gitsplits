#!/bin/bash

# Set up the environment on the server
# This script is meant to be run on the server

# Check if .env.local exists
if [ ! -f .env.local ]; then
  echo "Error: .env.local file not found"
  echo "Please make sure the .env.local file exists in the root directory"
  exit 1
fi

# Create necessary directories
mkdir -p logs
mkdir -p worker/logs

# Create symbolic links for environment files
ln -sf .env.local .env
ln -sf .env.local worker/.env.local

# Make scripts executable
chmod +x scripts/*.sh
chmod +x worker/run-local.sh

echo "Server environment has been set up successfully"