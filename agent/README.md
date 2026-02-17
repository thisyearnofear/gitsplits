# GitSplits Agent

Autonomous agent for compensating open source contributors via natural language commands.

## Overview

The GitSplits agent processes commands from Farcaster and the web UI, analyzes GitHub repositories, and executes payments through NEAR.

## Architecture

```
┌─────────────────────────────────────────┐
│           Intent Agent                  │
│  ┌─────────────────────────────────┐    │
│  │  Intent Parser                  │    │
│  │  (Natural → Structured)         │    │
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │  Tool Orchestrator              │    │
│  │  (GitHub, NEAR, Payments)       │    │
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │  Context Manager                │    │
│  │  (User state, conversations)    │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│         EigenCompute (TEE)              │
│    (Verifiable execution)               │
└─────────────────────────────────────────┘
```

## Project Structure

```
agent/
├── src/
│   ├── index.ts           # Agent entry point
│   ├── intents/           # Intent handlers (pay, create, analyze, verify)
│   ├── tools/             # GitHub, NEAR, Ping Pay, HOT Pay
│   └── context/           # User context management
├── deploy/                # EigenCompute deployment
└── Dockerfile.eigen       # TEE container
```

## Intents

| Intent | Example |
|--------|---------|
| `pay` | "pay 100 USDC to near-sdk-rs" |
| `create` | "create split for facebook/react" |
| `analyze` | "analyze near-sdk-rs" |
| `verify` | "verify my-github-username" |

## Environment Variables

```bash
# Required
AGENT_MODE=production                    # or 'mock' for testing
GITHUB_APP_ID=123456
GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----..."
NEAR_ACCOUNT_ID=gitsplits.near
NEAR_PRIVATE_KEY=ed25519:...
NEAR_CONTRACT_ID=gitsplits.near
PING_PAY_API_KEY=...
HOT_PAY_JWT=...
EIGENAI_WALLET_PRIVATE_KEY=0x...
EIGENAI_WALLET_ADDRESS=0x...

# Farcaster (optional)
NEYNAR_API_KEY=...
NEYNAR_SIGNER_UUID=...
FARCASTER_BOT_FID=...
```

## Running Locally

```bash
npm install

# Mock mode (no API keys)
AGENT_MODE=mock npm run dev

# Production mode
AGENT_MODE=production npm run dev
```

## Testing

```bash
# Unit tests
npm test

# Production preflight (live probes)
AGENT_MODE=production npm run test:production:preflight

# Production intents (canary-safe)
AGENT_MODE=production npm run test:production:intents
```

## Current Production Note

- `analyze`, `create`, `verify`, `pay`, and `pending` have been verified against live services.
- Payment distribution is verification-gated: verified contributors are paid immediately, unverified contributors receive pending claims until they verify.

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) and [deploy/EIGENCOMPUTE.md](./deploy/EIGENCOMPUTE.md).

## License

MIT
