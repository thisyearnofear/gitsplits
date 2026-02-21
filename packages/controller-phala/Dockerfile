# SURGICAL PRODUCTION DOCKERFILE FOR GITSPLITS SOVEREIGN MONOLITH
# Designed to avoid build bloat and timeouts by isolating Agent dependencies.

# --- Stage 1: Builder ---
FROM node:18-slim AS builder

WORKDIR /app

# Install minimal build tools for native dependency compilation (e.g., for ethers/viem)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy root manifest and workspace manifests
# We skip the frontend package.json to prevent unnecessary dependency resolution
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/controller-phala/package.json ./packages/controller-phala/

# Surgical Install: Only install dependencies for the Agent and Shared library.
# This prevents downloading massive frontend/Next.js dependencies, avoiding timeouts.
RUN npm install \
    --workspace=@gitsplits/shared \
    --workspace=gitsplits-controller-phala \
    --include=dev \
    --no-audit \
    --no-fund

# Copy source code for the relevant packages
COPY packages/shared ./packages/shared
COPY packages/controller-phala ./packages/controller-phala

# Build the monorepo packages in order
RUN npm run build:shared
RUN npm run build:agent

# Prune development dependencies to keep the final image slim
RUN npm prune --production \
    --workspace=@gitsplits/shared \
    --workspace=gitsplits-controller-phala

# --- Stage 2: Runner ---
FROM node:18-slim AS runner

WORKDIR /app

# Standard production environment variables
ENV NODE_ENV=production
ENV PORT=3002

# Create logs directory and set permissions
RUN mkdir -p /app/logs && chown -R node:node /app

# Copy pruned node_modules (contains root deps and workspace symlinks)
COPY --from=builder /app/node_modules ./node_modules

# Copy only the necessary built packages
# Node symlinks require the relative path from node_modules to remain consistent
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/packages/controller-phala/dist ./packages/controller-phala/dist
COPY --from=builder /app/packages/controller-phala/package.json ./packages/controller-phala/package.json

# Security: Run as non-root user
USER node

# Expose the Sovereign Controller port
EXPOSE 3002

# Start the Monolith Agent
CMD ["node", "packages/controller-phala/dist/index.js"]
