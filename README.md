# GitSplits

Autonomous AI agent that compensates open source contributors via natural language commands.

## Quick Demo

```
@gitsplits pay 100 USDC to github.com/near/near-sdk-rs
```

The agent analyzes the repository, calculates fair splits based on contribution history, and distributes funds to verified contributors.

## Features

- **Natural Language**: Just mention @gitsplits with a command
- **No Setup**: Contributors verify once, then auto-receive payments
- **Cross-Chain**: Contributors receive funds on their preferred chain
- **Web UI**: Interactive chat interface at https://gitsplits.xyz/agent

## How to Use

### For Contributors

**1. Verify (one-time):**
```
DM @gitsplits: verify your-github-username
```

**2. Receive payments automatically** when someone pays your repo.

### For Repository Owners

**Create a split:**
```
@gitsplits create split for github.com/my-org/my-repo
```

**Pay contributors:**
```
@gitsplits pay 100 USDC to my-org/my-repo
```

**Check analysis:**
```
@gitsplits analyze my-org/my-repo
```

## Architecture

```
Farcaster/Web → Intent Agent → EigenCompute (TEE) → NEAR + Payments
```

| Layer | Technology |
|-------|-----------|
| Social | Farcaster (@gitsplits bot) |
| Agent | Custom intent-based framework |
| Compute | EigenCompute (TEE + AVS) |
| Blockchain | NEAR Protocol |
| Payments | Ping Pay, HOT Pay |

## Web Interface

- **Agent**: https://gitsplits.xyz/agent
- **Verify**: https://gitsplits.xyz/verify
- **Splits**: https://gitsplits.xyz/splits
- **Dashboard**: https://gitsplits.xyz/dashboard

## Documentation

- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) — System design
- [agent/README.md](./agent/README.md) — Agent setup
- [agent/DEPLOYMENT.md](./agent/DEPLOYMENT.md) — Deployment guide

## Current Status (February 17, 2026)

- Agent is deployed on EigenCompute (Sepolia infra) and reachable at:
  - `https://agent.gitsplits.thisyearnofear.com`
- Readiness and health are passing:
  - `https://agent.gitsplits.thisyearnofear.com/ready`
  - `https://agent.gitsplits.thisyearnofear.com/health`
- Farcaster is currently disabled in runtime until Neynar vars are set.

## Development

### Prerequisites

- Node.js 18+
- API keys: GitHub App, NEAR, Ping Pay, EigenCompute

### Setup

```bash
# Agent
cd agent
npm install
cp .env.example .env
# Add API keys
npm run build
npm start

# Web app (root)
npm install
npm run dev
```

Web app expects `AGENT_BASE_URL` in `.env.local`:
```
AGENT_BASE_URL=http://localhost:3000
# deployed endpoint:
# AGENT_BASE_URL=https://agent.gitsplits.thisyearnofear.com
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
FARCASTER_PRIVATE_KEY=0x...
NEYNAR_API_KEY=...
```

## License

MIT
