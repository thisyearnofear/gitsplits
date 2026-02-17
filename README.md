# GitSplits

## 🏆 NEARCON 2026 Innovation Sandbox Submission

GitSplits is an autonomous AI agent that compensates open source contributors via natural language commands on Farcaster. Mention @gitsplits and pay contributors with a single message.

## 🎬 Quick Demo

```
@gitsplits pay 100 USDC to github.com/near/near-sdk-rs
```

The agent analyzes the repository, calculates fair splits based on contribution history, and distributes funds to verified contributors across any chain.

## 🚀 Features

- **Farcaster-Native**: Just mention @gitsplits with natural language
- **No Setup**: Contributors verify once via DM, then auto-receive payments
- **Autonomous**: Single command triggers full distribution flow
- **Cross-Chain**: Contributors receive funds on their preferred chain

## ✅ Production Progress (Feb 17, 2026)

- Live production preflight checks are passing for GitHub App, NEAR, Ping/HOT Pay, and EigenAI.
- Live canary intent tests are passing for `analyze`, `create`, and `pay`.
- Payment routing uses Ping Pay first and falls back to HOT partner API if Ping endpoints are unavailable.
- Latest validation run: `AGENT_MODE=production` preflight `11/11` and intents `3/3` passed.
- Web app is now decoupled from agent build: `/api/agent` proxies to `AGENT_BASE_URL` over HTTP.

## 📋 How to Use

### For Contributors

**1. Verify your identity (one-time):**
```
DM @gitsplits: verify your-github-username
```
Follow the instructions to link your GitHub and wallet.

**2. Receive payments automatically:**
When someone pays your repo, funds go directly to your verified wallet.

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

## 🏗️ Architecture

```
Farcaster → Intent Agent → EigenCompute (TEE) → NEAR + Sponsors
```

| Layer | Technology |
|-------|-----------|
| Social | Farcaster (@gitsplits bot) |
| Agent | Custom intent-based framework |
| Compute | EigenCloud EigenCompute (TEE + AVS) |
| Blockchain | NEAR Protocol |
| Payments | Ping Pay (NEAR Intents) |

## Web Interface

- **Agent Chat**: https://gitsplits.xyz/agent (Interactive natural language interface)
- **Verify identity**: https://gitsplits.xyz/verify
- **View splits**: https://gitsplits.xyz/splits
- **Dashboard**: https://gitsplits.xyz/dashboard

## Documentation

- [ARCHITECTURE.md](./docs/ARCHITECTURE.md) — System design
- [COMMANDS.md](./docs/COMMANDS.md) — Full command reference

## Development (GitSplits Team Only)

### Prerequisites

- Node.js 18+
- API keys: GitHub App, NEAR, Ping Pay, EigenCloud

### Setup

```bash
cd agent
npm install
cp .env.example .env
# Add API keys (team only)
npm run build
npm start
```

Web app expects a separately running agent service:

```bash
# in root .env.local for Next.js
AGENT_BASE_URL=http://localhost:3001
AGENT_API_KEY=
```

If you set `AGENT_API_KEY` in web, set matching `AGENT_SERVER_API_KEY` in `agent/.env`.

### Environment Variables

```bash
# Farcaster bot
FARCASTER_PRIVATE_KEY=0x...
FARCASTER_FID=12345

# GitHub App (single app for all repos)
GITHUB_APP_ID=123456
GITHUB_PRIVATE_KEY="..."

# NEAR
NEAR_ACCOUNT_ID=gitsplits.near
NEAR_PRIVATE_KEY=ed25519:...
NEAR_CONTRACT_ID=gitsplits.near

# Ping Pay
PING_PAY_API_KEY=...

# EigenCloud
EIGENCLOUD_API_KEY=...
```

## License

MIT
