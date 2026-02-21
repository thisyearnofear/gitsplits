# PRODUCTION-READY DOCKERFILE FOR GITSPLITS SOVEREIGN MONOLITH
# Optimized for Phala Network (dstack) deployment.

# --- Stage 1: Builder ---
FROM node:18-slim AS builder

# Install build dependencies (required for some native crypto packages)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/controller-phala/package.json ./packages/controller-phala/package.json

# Install ALL dependencies (including devDeps for compilation)
# We use npm install instead of npm ci to handle the local monorepo symlinks correctly
RUN npm install

# Copy source code
COPY packages/shared ./packages/shared
COPY packages/controller-phala ./packages/controller-phala

# Build the monorepo packages in order
RUN npm run build:shared
RUN npm run build:agent

# Remove devDependencies to reduce image size
RUN npm prune --production

# --- Stage 2: Runner ---
FROM node:18-slim AS runner

WORKDIR /app

# Standard production environment variables
ENV NODE_ENV=production
ENV PORT=3002

# Create logs directory and set permissions
RUN mkdir -p /app/logs && chown -R node:node /app

# Copy pruned node_modules from builder
# This includes the root node_modules with the @gitsplits/shared symlink
COPY --from=builder /app/node_modules ./node_modules

# Copy package manifests
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/packages/controller-phala/package.json ./packages/controller-phala/package.json

# Copy built artifacts
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/controller-phala/dist ./packages/controller-phala/dist

# Security: Run as non-root user
USER node

# Expose the Sovereign Controller port
EXPOSE 3002

# Start the Monolith Agent
# Points to the compiled entrypoint in the controller package
CMD ["node", "packages/controller-phala/dist/index.js"]
