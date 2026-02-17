# GitSplits Agent

OpenClaw-powered autonomous agent for compensating open source contributors.

## Overview

This is the core agent that powers GitSplits. It runs on EigenCloud's TEE infrastructure and handles:

- Natural language command parsing from Farcaster
- GitHub repository analysis
- NEAR smart contract interactions
- Cross-chain payment execution (Ping Pay primary, HOT Pay fallback)

## Production Status (Feb 17, 2026)

- `AGENT_MODE=production` preflight tests passing against live GitHub App, NEAR, Ping/HOT Pay, and EigenAI.
- Live `analyze`, `create`, and `pay` canary intent tests are passing.
- Pay flow behavior:
  - Tries Ping Pay first.
  - Falls back to HOT partner API when Ping endpoint is unavailable.

## Architecture

```
┌─────────────────────────────────────────┐
│           OpenClaw Agent                │
│  ┌─────────────────────────────────┐    │
│  │  Intent Parser                  │    │
│  │  (Natural → Structured)         │    │
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │  Tool Orchestrator              │    │
│  │  (GitHub, NEAR, Ping Pay)       │    │
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │  Context Manager                │    │
│  │  (User state, conversations)    │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│         EigenCloud TEE                  │
│    (Verifiable execution)               │
└─────────────────────────────────────────┘
```

## Project Structure

```
agent/
├── src/
│   ├── index.ts           # Agent entry point
│   ├── intents/           # Intent handlers
│   │   ├── pay.ts
│   │   ├── create.ts
│   │   ├── analyze.ts
│   │   └── verify.ts
│   ├── tools/             # Tool implementations
│   │   ├── github.ts
│   │   ├── near.ts
│   │   └── pingpay.ts
│   └── context/           # Context management
│       └── user.ts
├── skills/                # OpenClaw skills (internal)
│   └── gitsplits.ts
└── tests/
    └── intents.test.ts
```

## Intents

The agent recognizes these intents from natural language:

| Intent | Example Triggers |
|--------|-----------------|
| `pay` | "pay 100 USDC to repo", "send money to contributors" |
| `create` | "create split for repo", "set up payments" |
| `analyze` | "analyze repo", "who contributes to repo" |
| `verify` | "verify my github", "link my identity" |
| `help` | "help", "what can you do" |

## Tools

| Tool | Purpose |
|------|---------|
| `github.analyze` | Fetch contributor data from GitHub |
| `near.createSplit` | Create split on NEAR contract |
| `near.getSplit` | Query existing split |
| `pingpay.distribute` | Execute cross-chain distribution |
| `hotpay.distribute` | HOT partner API fallback distribution |
| `eigenai.analyzeContributions` | Verifiable AI analysis + signature |

## Environment Variables

```bash
# OpenClaw
OPENCLAW_API_KEY=...

# Farcaster
FARCASTER_PRIVATE_KEY=...
FARCASTER_SIGNER_KEY=...

# EigenCloud
EIGENCLOUD_API_KEY=...
EIGENCLOUD_ENDPOINT=...

# NEAR
NEAR_ACCOUNT_ID=...
NEAR_PRIVATE_KEY=...
NEAR_CONTRACT_ID=...

# Ping Pay
PING_PAY_API_KEY=...

# GitHub App (recommended for production)
GITHUB_APP_ID=...
GITHUB_PRIVATE_KEY="..."

# Optional local/dev fallback
GITHUB_TOKEN=...

# Ping Pay
PING_PAY_API_KEY=...
# Optional endpoint overrides
# PING_PAY_API_BASE=https://api.pingpay.io
# PING_PAY_INTENTS_PATH=/v1/intents
# PING_PAY_PROBE_PATH=/v1/intents/probe

# HOT Pay fallback
HOT_PAY_JWT=...
HOT_PAY_NEAR_ACCOUNT=...

# EigenAI grant auth
EIGENAI_WALLET_PRIVATE_KEY=0x...
EIGENAI_WALLET_ADDRESS=0x...

# Canary production tests
TEST_ANALYZE_REPO=owner/repo
TEST_CREATE_REPO=owner/repo
TEST_PAY_REPO=owner/repo
TEST_PAY_TOKEN=USDC
TEST_PAY_AMOUNT=1
TEST_PAY_MAX_AMOUNT=1
# TEST_CANARY_REPOS=github.com/owner/repo
```

## Running Locally

```bash
npm install
npm run dev
```

## Deployment to EigenCloud

```bash
# Build container
docker build -t gitsplits-agent -f Dockerfile.eigen .

# Deploy to EigenCompute
eigencloud deploy --image gitsplits-agent --tee
```

## Testing

```bash
npm test

# Production preflight (live probes)
AGENT_MODE=production npm run test:production:preflight

# Production live intents (canary-safe)
AGENT_MODE=production npm run test:production:intents -- --runInBand
```
