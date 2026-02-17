#!/bin/bash

# GitSplits Agent Deployment Script
# Deploys to EigenCompute using the @layr-labs/ecloud-cli

set -e

TESTNET=false

for arg in "$@"; do
  case $arg in
    --testnet)
      TESTNET=true
      shift
      ;;
  esac
done

echo "🚀 Deploying GitSplits Agent to EigenCompute..."

# Check prerequisites
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is required"
    echo "Install: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command -v ecloud &> /dev/null; then
    echo "❌ ecloud CLI is required"
    echo "Install: npm install -g @layr-labs/ecloud-cli"
    exit 1
fi

# Verify authentication
echo "🔑 Verifying authentication..."
if ! ecloud auth whoami; then
    echo "❌ Not authenticated. Run: ecloud auth login"
    exit 1
fi

# Set testnet environment if requested
if [ "$TESTNET" = true ]; then
    echo "🧪 Setting environment to Sepolia testnet..."
    ecloud compute env set sepolia
fi

# Deploy (ecloud handles docker build, push, and deploy from the Dockerfile)
echo "🚀 Running ecloud compute app deploy..."
cd "$(dirname "$0")/.."
ecloud compute app deploy

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Useful commands:"
echo "  Check logs:   ecloud compute app logs"
echo "  Check status: ecloud compute app info"
