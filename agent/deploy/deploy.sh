#!/bin/bash

# GitSplits Agent Deployment Script
# Deploys to EigenCloud EigenCompute

set -e

echo "🚀 Deploying GitSplits Agent to EigenCloud..."

# Configuration
IMAGE_NAME="gitsplits-agent"
IMAGE_TAG="${1:-latest}"
EIGENCLOUD_PROJECT="${EIGENCLOUD_PROJECT:-gitsplits}"

# Check prerequisites
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is required"
    exit 1
fi

if ! command -v eigencloud &> /dev/null; then
    echo "❌ EigenCloud CLI is required"
    echo "Install: npm install -g @eigencloud/cli"
    exit 1
fi

# Build the image
echo "📦 Building Docker image..."
cd ..
docker build -t ${IMAGE_NAME}:${IMAGE_TAG} -f Dockerfile.eigen .

# Tag for EigenCloud registry
docker tag ${IMAGE_NAME}:${IMAGE_TAG} registry.eigencloud.xyz/${EIGENCLOUD_PROJECT}/${IMAGE_NAME}:${IMAGE_TAG}

# Push to EigenCloud registry
echo "📤 Pushing to EigenCloud registry..."
docker push registry.eigencloud.xyz/${EIGENCLOUD_PROJECT}/${IMAGE_NAME}:${IMAGE_TAG}

# Deploy to EigenCompute
echo "🚀 Deploying to EigenCompute..."
eigencloud deploy \
    --config eigencloud.yaml \
    --image registry.eigencloud.xyz/${EIGENCLOUD_PROJECT}/${IMAGE_NAME}:${IMAGE_TAG} \
    --project ${EIGENCLOUD_PROJECT} \
    --name gitsplits-agent \
    --tee

echo "✅ Deployment complete!"
echo ""
echo "Check status:"
echo "  eigencloud logs --project ${EIGENCLOUD_PROJECT} --name gitsplits-agent"
echo "  eigencloud status --project ${EIGENCLOUD_PROJECT} --name gitsplits-agent"
