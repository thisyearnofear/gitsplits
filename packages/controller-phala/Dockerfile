# EXTREME ISOLATION DOCKERFILE FOR GITSPLITS AGENT
# Optimized for Hetzner VPS with restricted disk space and memory.
# This build completely BYPASSES the root package-lock.json and frontend dependencies.

# --- Stage 1: Builder ---
FROM node:18-slim AS builder

WORKDIR /app

# Install minimal build tools for native compilation (e.g. for secp256k1/ethers)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# 1. Build Shared Library first
COPY packages/shared ./packages/shared
RUN cd packages/shared && \
    npm install --no-package-lock && \
    npm run build

# 2. Build Monolith Agent
COPY packages/controller-phala ./packages/controller-phala
RUN cd packages/controller-phala && \
    # Link local shared dependency manually to bypass workspace resolution
    npm install ../shared --no-package-lock && \
    # Install remaining agent-specific dependencies
    npm install --no-package-lock && \
    npm run build

# --- Stage 2: Runner ---
FROM node:18-slim AS runner

WORKDIR /app

# Production environment
ENV NODE_ENV=production
ENV PORT=3002

# Create logs directory
RUN mkdir -p /app/logs && chown -R node:node /app

# 3. Copy only runtime essentials
# We copy the entire shared folder because controller-phala's node_modules symlinks into it
COPY --from=builder /app/packages/shared /app/packages/shared
COPY --from=builder /app/packages/controller-phala/dist /app/packages/controller-phala/dist
COPY --from=builder /app/packages/controller-phala/node_modules /app/packages/controller-phala/node_modules
COPY --from=builder /app/packages/controller-phala/package.json /app/packages/controller-phala/package.json

# Security
USER node

# Expose Agent Port
EXPOSE 3002

# Start the Agent
# We use the relative path to the compiled entrypoint
CMD ["node", "packages/controller-phala/dist/index.js"]
