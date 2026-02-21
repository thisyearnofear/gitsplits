# HYPER-ISOLATED PRODUCTION DOCKERFILE FOR GITSPLITS AGENT
# Optimized for high-performance builds on resource-constrained hardware (e.g. low-disk Hetzner VPS).
# This Dockerfile surgically avoids installing frontend/Next.js dependencies to prevent timeouts.

# --- Stage 1: Builder ---
FROM node:18-slim AS builder

WORKDIR /app

# Install minimal build tools for native dependency compilation (required by ethers/viem)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# 1. Copy Monorepo Manifests ONLY
# We only copy the manifests for the root and the specific packages we need.
# This prevents NPM from trying to resolve the massive frontend workspace.
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/controller-phala/package.json ./packages/controller-phala/

# 2. Surgical Dependency Installation
# By specifying --workspace, we ignore the frontend package.
# This cuts the build-time download from ~900MB to ~150MB.
RUN npm install \
    --workspace=@gitsplits/shared \
    --workspace=gitsplits-controller-phala \
    --include=dev \
    --no-audit \
    --no-fund

# 3. Copy Source Code
# We only copy the directories we intend to build.
COPY packages/shared ./packages/shared
COPY packages/controller-phala ./packages/controller-phala

# 4. Monorepo-Aware Build
# These scripts are defined in the root package.json
RUN npm run build:shared
RUN npm run build:agent

# 5. Prune Development Dependencies
RUN npm prune --production \
    --workspace=@gitsplits/shared \
    --workspace=gitsplits-controller-phala

# --- Stage 2: Runner ---
FROM node:18-slim AS runner

WORKDIR /app

# Runtime configuration
ENV NODE_ENV=production
ENV PORT=3002

# Secure log environment
RUN mkdir -p /app/logs && chown -R node:node /app

# 6. Optimized Payload Copy
# We copy node_modules (which contains root deps and the @gitsplits/shared symlink)
COPY --from=builder /app/node_modules ./node_modules

# We copy the packages themselves so the hoisted symlinks don't break
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/packages/controller-phala/dist ./packages/controller-phala/dist
COPY --from=builder /app/packages/controller-phala/package.json ./packages/controller-phala/package.json

# Security: Run as non-privileged user
USER node

# Expose the Sovereign Controller port
EXPOSE 3002

# 7. Monolith Execution
# Execute from the root to ensure standard Node.js module resolution via hoisted node_modules
CMD ["node", "packages/controller-phala/dist/index.js"]
