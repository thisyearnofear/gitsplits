# GitSplits Architecture

GitSplits is an autonomous AI agent that compensates open source contributors via natural language commands on Farcaster. Powered by our custom intent-based agent framework, running on EigenCloud's verifiable compute.

## Overview

```
User (Farcaster) → Intent Agent → EigenCompute (TEE) → NEAR + Sponsors
```

## Components

### 1. Intent-Based Agent Framework (`/agent/src/core/`)

Custom lightweight framework for natural language command processing:

- **Intent Recognition**: Pattern-based parsing (e.g., "pay {amount} {token} to {repo}")
- **Tool Registry**: Coordinates GitHub API, NEAR contract, payment execution
- **Context Management**: Per-user conversation state and preferences

### 2. Farcaster Integration (`/agent/src/farcaster/`)

Autonomous social layer:

- **@gitsplits bot**: Lives on Farcaster, responds to mentions and DMs
- **Natural language**: Users type commands in plain English
- **No setup required**: Users just mention @gitsplits

### 3. Intents (`/agent/src/intents/`)

| Intent | Description | Example |
|--------|-------------|---------|
| `pay` | Distribute funds to contributors | "pay 100 USDC to near-sdk-rs" |
| `create` | Create new split for repo | "create split for near-sdk-rs" |
| `analyze` | Show contribution breakdown | "analyze near-sdk-rs" |
| `verify` | Link GitHub to wallet | "verify my-github-username" |

### 4. Tools (`/agent/src/tools/`)

| Tool | Purpose | Status |
|------|---------|--------|
| `github` | Repo analysis via GitHub App | ✅ Implemented |
| `near` | Smart contract interactions | ✅ Live on Mainnet (`lhkor_marty.near`) |
| `pingpay` | Cross-chain payments | ✅ Implemented |
| `hotpay` | Fiat & NEAR payments | ✅ Live |

**GitHub Authentication:** Uses a single GitHub App owned by GitSplits team. Users don't need their own tokens.

### 5. EigenCloud EigenCompute

Shade Agent runs in a TEE container:

- **Verifiable Execution**: Cryptographic attestation of all operations
- **Chain Signatures**: Cross-chain transaction signing
- **AVS Backing**: Actively Validated Service for slashing

### 6. Sponsor Integrations

| Sponsor | Purpose | Status |
|---------|---------|--------|
| **Ping Pay** | Cross-chain payments via NEAR Intents | ✅ Implemented |
| **HOT Pay** | Fiat onramp & NEAR payments | ✅ Live |
| **EigenCloud** | Verifiable compute (TEE + AVS) | ✅ Implemented |
| **NOVA** | Private data encryption | 🔲 Future integration |

### 7. NEAR Smart Contract

- Split management
- Contributor registry with percentages
- Identity verification
- Chain signature generation

### 8. Web UI & Agent API (`/src/app/`)

The Next.js frontend provides a visual interface for the agent:

- **Agent Chat UI** (`/src/app/agent/`): A clean, interactive interface for sending natural language commands.
- **Agent API Route** (`/src/app/api/agent/`): Bridges the web interface to the agent's core processing engine.
- **Verification Flow** (`/src/app/verify/`): Secure identity linking for contributors.
- **Dashboard** (`/src/app/dashboard/`): Visual management of splits and repository analytics.

## System Workflow

```
[Web UI Chat] --(JSON)--> [Next.js API] --(Import)--> [Agent Engine]
[Farcaster] --(Mention)--> [Neynar API] --(Webhook)--> [Agent Engine]
```

## User Flow

### For Contributors (No Setup Required)

```
1. User sees @gitsplits mentioned on Farcaster
2. User casts: "@gitsplits pay 100 USDC to near-sdk-rs"
3. Agent analyzes repo, finds contributors
4. If user is a contributor, they verify via DM
5. Agent distributes funds to verified wallets
```

### For Repository Owners

```
1. Owner casts: "@gitsplits create split for my-org/my-repo"
2. Agent analyzes repo, creates split
3. Owner can now receive payments and distribute to contributors
```

## File Structure

```
/
├── agent/                      # Intent-based agent (runs on EigenCloud)
│   ├── src/
│   │   ├── core/              # Agent framework
│   │   ├── intents/           # Pay, create, analyze, verify
│   │   ├── tools/             # GitHub, NEAR, Ping Pay
│   │   └── farcaster/         # Social layer
│   ├── deploy/                # EigenCloud config
│   └── Dockerfile.eigen       # TEE container
├── contracts/near/             # NEAR smart contract
├── src/                        # Web UI (Next.js)
│   └── app/
│       ├── verify/            # GitHub verification flow
│       └── dashboard/         # Split management
└── docs/                       # Documentation
```

## Environment Variables (For GitSplits Team Only)

```bash
# Farcaster (bot account)
FARCASTER_PRIVATE_KEY=0x...
FARCASTER_FID=12345

# GitHub App (single app for all repos)
GITHUB_APP_ID=123456
GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----..."

# NEAR (team account)
NEAR_ACCOUNT_ID=gitsplits.near
NEAR_PRIVATE_KEY=ed25519:...
NEAR_CONTRACT_ID=gitsplits.near

# Ping Pay (team account)
PING_PAY_API_KEY=...

# EigenCloud (deployment)
EIGENCLOUD_API_KEY=...
```

## Deployment

### Build

```bash
cd agent
npm run build
docker build -t gitsplits-agent -f Dockerfile.eigen .
```

### Deploy to EigenCloud

```bash
cd agent/deploy
./deploy.sh
```

## Current Status

| Component | Status | Notes |
|-----------|--------|-------|
| Agent framework | ✅ Complete | Intent parsing, tool registry, context |
| Farcaster client | ✅ Complete | Real integration |
| GitHub tool | ✅ Complete | Single GitHub App for all repos |
| NEAR tool | ✅ Live | Mainnet deployed (`lhkor_marty.near`) |
| Ping Pay tool | ✅ Complete | Real API calls |
| HOT Pay tool | ✅ Live | Mainnet Verified |
| Web UI & API | ✅ Complete | Interactive chat and dashboard |
| EigenCloud deploy | 🔲 Ready | Config and Dockerfile ready |
| TEE attestation | 🔲 Pending | Requires EigenCloud deployment |

## Next Steps

1. **Get API keys** (GitSplits team only):
   - Create GitHub App at github.com/settings/apps
   - Get Ping Pay API key
   - Get EigenCloud API key
   - NEAR mainnet is set up on `lhkor_marty.near`
   - HOT Pay is set up on `papajams.near`

2. **Deploy to EigenCloud**

3. **Register Farcaster FID** for @gitsplits

4. **Test with real APIs**
