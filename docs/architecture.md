# GitSplits Architecture

## Overview

GitSplits is an autonomous agent that compensates open source contributors via natural language commands.

```
User (Farcaster/Web) → Intent Agent → EigenCompute (TEE) → NEAR + Payments
```

## Components

### 1. Intent Agent (`/agent/src/`)

Custom lightweight framework for natural language processing:

- **Intent Recognition**: Pattern-based parsing
- **Tool Registry**: GitHub API, NEAR contract, payments
- **Context Management**: Per-user conversation state

### 2. Intents

| Intent | Description | Example |
|--------|-------------|---------|
| `pay` | Distribute funds | "pay 100 USDC to near-sdk-rs" |
| `create` | Create split | "create split for near-sdk-rs" |
| `analyze` | Show contributions | "analyze near-sdk-rs" |
| `verify` | Link GitHub to wallet | "verify my-github-username" |

### 3. Tools

| Tool | Purpose |
|------|---------|
| `github` | Repo analysis via GitHub App |
| `near` | Smart contract interactions |
| `pingpay` | Cross-chain payments |
| `hotpay` | Fiat & NEAR payments |

### 4. EigenCompute

Agent runs in a TEE container:

- **Verifiable Execution**: Cryptographic attestation
- **Chain Signatures**: Cross-chain transaction signing
- **AVS Backing**: Actively Validated Service

### 5. Web UI (`/src/app/`)

- **Agent Chat** (`/agent`): Natural language interface
- **API** (`/api/agent`): Proxies to agent service
- **Verify** (`/verify`): Identity linking
- **Dashboard** (`/dashboard`): Split management

## File Structure

```
/
├── agent/                 # Intent agent (EigenCompute)
│   ├── src/intents/      # Pay, create, analyze, verify
│   ├── src/tools/        # GitHub, NEAR, payments
│   └── deploy/           # EigenCompute deployment
├── contracts/near/       # NEAR smart contract
├── src/app/              # Web UI (Next.js)
│   ├── agent/           # Chat interface
│   ├── api/agent/       # API proxy
│   ├── verify/          # Verification flow
│   └── dashboard/       # Split management
└── docs/                # Documentation
```

## Environment Variables

```bash
# GitHub App
GITHUB_APP_ID=123456
GITHUB_PRIVATE_KEY="..."

# NEAR
NEAR_ACCOUNT_ID=gitsplits.near
NEAR_PRIVATE_KEY=ed25519:...
NEAR_CONTRACT_ID=gitsplits.near

# Payments
PING_PAY_API_KEY=...
HOT_PAY_JWT=...

# EigenCompute
EIGENAI_WALLET_PRIVATE_KEY=0x...
EIGENAI_WALLET_ADDRESS=0x...

# Farcaster (optional)
NEYNAR_API_KEY=...
NEYNAR_SIGNER_UUID=...
```

## Deployment

```bash
# Build agent
cd agent
npm run build
docker build -t gitsplits-agent -f Dockerfile.eigen .

# Deploy to EigenCompute
cd deploy
./deploy.sh
```

## Status

| Component | Status |
|-----------|--------|
| Agent framework | ✅ Complete |
| Farcaster client | ✅ Complete |
| GitHub tool | ✅ Complete |
| NEAR tool | ✅ Live (mainnet) |
| Ping Pay | ✅ Complete |
| HOT Pay | ✅ Live |
| Web UI | ✅ Complete |
| EigenCompute | ✅ Deployed |
