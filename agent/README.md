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
| `reputation` | "reputation for lovable-dev[bot]" |

## Environment Variables

```bash
# Required
AGENT_MODE=production                    # or 'mock' for testing
GITHUB_APP_ID=123456
GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----..."
NEAR_ACCOUNT_ID=lhkor_marty.near
NEAR_PRIVATE_KEY=ed25519:...
NEAR_CONTRACT_ID=lhkor_marty.near
PING_PAY_API_KEY=...
HOT_PAY_JWT=...
EIGENAI_WALLET_PRIVATE_KEY=0x...
EIGENAI_WALLET_ADDRESS=0x...

# Agentic controls (optional, recommended)
AGENT_DEFAULT_EXEC_MODE=execute         # advisor | draft | execute
AGENT_HANDS_OFF_MIN_CONFIDENCE=0.65
AGENT_REQUIRE_APPROVAL=false            # true = plan+approve required for create/pay
AGENT_MIN_PARSE_CONFIDENCE=0.45
AGENT_ALLOWED_TOKENS=NEAR,USDC
AGENT_MAX_PAYOUT_AMOUNT=250
AGENT_CANARY_ONLY_PAY=false
AGENT_PLAN_TTL_MS=600000

# Continuous canary monitor (production optional)
AGENT_CANARY_MONITOR=false
AGENT_CANARY_INTERVAL_MINUTES=30

# Optional reputation integrations
REPUTATION_API_BASE=...
ERC8004_REGISTRY_API=...
REPUTATION_MIN_PAYOUT_SCORE=50

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

# Run one canary probe sweep manually
AGENT_MODE=production npm run canary:once
```

## Current Production Note

- `analyze`, `create`, `verify`, `pay`, and `pending` have been verified against live services.
- Payment distribution is verification-gated: verified contributors are paid immediately, unverified contributors receive pending claims until they verify.
- Agent v2 hardening adds execution modes, plan/draft flow, policy gates, safety alerts, structured telemetry, replay hooks, and optional continuous canary monitoring.
- Hands-off experience mode (`experience hands-off`) enables LLM-assisted intent interpretation with suggested outcomes before execution.
- Agent economy support includes reputation scoring hooks + optional ERC-8004 registry lookups for agent contributors.

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) and [deploy/EIGENCOMPUTE.md](./deploy/EIGENCOMPUTE.md).

## License

MIT
