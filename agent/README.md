# GitSplits Agent

OpenClaw-powered autonomous agent for compensating open source contributors.

## Overview

This is the core agent that powers GitSplits. It runs on EigenCloud's TEE infrastructure and handles:

- Natural language command parsing from Farcaster
- GitHub repository analysis
- NEAR smart contract interactions
- Cross-chain payment execution

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

# GitHub
GITHUB_TOKEN=...
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
```
