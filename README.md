# GitSplits

Autonomous AI agent that compensates open source contributors via natural language commands, running on EigenCompute for cryptographic transparency.

## Quick Demo

```
@gitsplits pay 100 USDC to github.com/near/near-sdk-rs
```

The agent analyzes the repository, calculates fair splits based on contribution history, and distributes funds to verified contributors.

## Features

- **Natural Language**: Just mention @gitsplits with a command
- **No Setup**: Contributors verify once, then auto-receive payments
- **Cross-Chain**: Contributors receive funds on their preferred chain
- **Cryptographic Transparency**: Optional attestations via EigenCompute TEE
- **Web UI**: Interactive chat interface at https://gitsplits.vercel.app/agent

## Why EigenCompute?

GitSplits runs on [EigenCompute](https://eigencloud.xyz/) to provide:

| Feature | Benefit |
|---------|---------|
| **Attested Execution** | Cryptographic proof that splits were calculated fairly |
| **Verifiable Agent** | Anyone can verify the agent behaved correctly |
| **Optional Privacy** | Private repo analysis without exposing sensitive data |
| **TEE Security** | Hardware-secure computation, encrypted even from us |

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

**Check pending claims:**
```
@gitsplits pending my-org/my-repo
```

**Check analysis:**
```
@gitsplits analyze my-org/my-repo
```

## Architecture

```
Farcaster/Web → Intent Agent → EigenCompute (TEE) → NEAR + Payments
                                    ↓
                          Attestation of Execution
```

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Social | Farcaster (@gitsplits bot) | Natural language interface |
| Agent | Custom intent-based framework | Command parsing & orchestration |
| Compute | EigenCompute (TEE + AVS) | Verifiable, private execution |
| Blockchain | NEAR Protocol | Split contracts & payments |
| Payments | Ping Pay, HOT Pay | Cross-chain distribution |

## Web Interface

- **Agent**: https://gitsplits.vercel.app/agent
- **Verify**: https://gitsplits.vercel.app/verify
- **Splits**: https://gitsplits.vercel.app/splits
- **Dashboard**: https://gitsplits.vercel.app/dashboard

### Web-First Status (February 17, 2026)

- `/dashboard` now acts as a web control hub and checks live agent readiness via `/api/agent`.
- `/verify` now performs GitHub gist + NEAR signature verification and syncs successful links to the agent/contract path used by payouts.
- `/splits` now uses the live agent proxy (`/api/agent`) for analyze/create flows (instead of the old placeholder NEAR demo service).
- `pay` now supports partial payouts by default: verified contributors are paid immediately and unverified contributors get pending claims until they verify.
- `/api/contributor-status` now resolves per-contributor verification + wallet status from the live NEAR contract for real UI badges.
- `/splits` now includes payout controls, structured payout receipts, outreach artifacts, and a help panel for failed paths.
- `/dashboard` now includes a local activity timeline and recovery actions for common operator issues.
- Playwright desktop/mobile E2E scaffolding is added (`playwright.config.ts`, `tests/e2e/full-flow.spec.ts`); local pass/fail in this environment is currently limited by slow dev-runtime navigation behavior.

## Documentation

- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) — System design
- [agent/README.md](./agent/README.md) — Agent setup
- [agent/DEPLOYMENT.md](./agent/DEPLOYMENT.md) — Deployment guide

## Current Status (February 18, 2026)

- ✅ EigenCompute agent is live on Sepolia and running verifiable builds/upgrades
- ✅ Production endpoint: `https://agent.gitsplits.thisyearnofear.com`
- ✅ Hetzner fallback remains available for recovery/testing
- ✅ Web UI: `https://gitsplits.vercel.app`
- 🔄 Farcaster temporarily disabled pending Neynar configuration

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

### Environment Configuration

**Web app (`.env.local`):**
```bash
# Production (EigenCompute)
AGENT_BASE_URL=https://agent.gitsplits.thisyearnofear.com

# Or local development
# AGENT_BASE_URL=http://localhost:3000

# Required for wallet connect
NEXT_PUBLIC_PROJECT_ID=<from https://cloud.reown.com>
```

**Agent server (`.env`):**
```bash
# Optional process endpoint protection
AGENT_SERVER_API_KEY=...
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
