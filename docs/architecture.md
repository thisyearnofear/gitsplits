# GitSplits Architecture

## Overview

GitSplits compensates open source contributors through an intent agent, verification mapping on NEAR, and direct payout flows from user wallets.

```
Web/Farcaster -> Intent Agent -> EigenCompute (TEE) -> GitHub + NEAR + Payments
```

## Components

### 1. Intent Agent (`/agent/src/`)

- Intent parsing: `analyze`, `create`, `pay`, `verify`, `splits`, `pending`
- Tool orchestration: GitHub, NEAR, Ping Pay/HOT, EigenAI
- Production readiness checks and preflight validations

### 2. Contract Layer (`/contracts/near`)

- Split registry: `create_split`, `update_split`, `get_split_by_repo`
- Public verification map: `github_username <-> near wallet`
- Pagination/search helpers for frontend mapping explorer
- Pending distribution records for unverified recipients

### 3. Web UI (`/src/app/`)

| Path | Purpose |
|------|---------|
| `/dashboard` | Status, activity, recovery actions |
| `/verify` | GitHub gist + wallet verification flow |
| `/splits` | Guided analyze -> split -> pay experience |
| `/agent` | Natural language assistant |
| `/api/*` | Proxy + read endpoints |

### 4. Compute and Runtime

- **Primary:** EigenCompute (verifiable app upgrades)
- **Fallback:** Hetzner runtime for staging/recovery

---

## System Flow

1. User analyzes repository (`analyze owner/repo`)
2. Agent returns contributors + verification coverage + AI insight
3. User creates or refreshes split (`create split for owner/repo`)
4. User funds payouts from connected wallet (NEAR first-class)
5. Verified contributors receive direct distributions
6. Unverified contributors routed to verification + pending flows

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      USER (Web/Farcaster)                    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    INTENT AGENT                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Intent Parser  │  Tool Registry  │  Context Manager  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                 EIGENCOMPUTE (TEE + AVS)                     │
│  - Attested execution    - Chain signatures                 │
│  - Hardware isolation    - Verifiable builds                │
└─────────────────────────────────────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            ▼               ▼               ▼
     ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
     │   GitHub    │ │    NEAR     │ │  Payments   │
     │   (Commits) │ │  (Splits)   │ │(Ping/HOT)   │
     └─────────────┘ └─────────────┘ └─────────────┘
```

---

## Environment Model

### Agent Runtime

```bash
AGENT_MODE=production
GITHUB_APP_ID=...
GITHUB_PRIVATE_KEY=...
GITHUB_TOKEN=...            # Optional fallback
NEAR_ACCOUNT_ID=...
NEAR_PRIVATE_KEY=...
NEAR_CONTRACT_ID=lhkor_marty.near
PING_PAY_API_KEY=...
HOT_PAY_JWT=...
EIGENAI_WALLET_PRIVATE_KEY=0x...
EIGENAI_WALLET_ADDRESS=0x...
```

### Web Runtime

```bash
AGENT_BASE_URL=https://agent.gitsplits.thisyearnofear.com
NEXT_PUBLIC_PROJECT_ID=...
NEXT_PUBLIC_CONTRACT_ID=lhkor_marty.near
```

---

## Readiness Contract

| Endpoint | Purpose |
|----------|---------|
| `/ready` | Fails when production dependencies invalid |
| `/health` | Service-level status |

**`/ready` validates:**
- GitHub App credentials (or PAT fallback)
- NEAR signer + contract config
- Ping/HOT payment auth
- EigenAI grant wallet configuration

---

## File Structure

```
gitsplits/
├── agent/
│   ├── src/
│   │   ├── index.ts        # Entry point
│   │   ├── intents/        # pay, create, analyze, verify...
│   │   ├── tools/          # github, near, pingpay, hot
│   │   └── context/        # User state management
│   ├── deploy/             # EigenCompute deployment
│   ├── Dockerfile.eigen    # TEE container
│   └── .env                # Server env vars
├── contracts/near/
│   └── src/                # Rust smart contract
├── src/app/                # Next.js web UI
│   ├── agent/
│   ├── verify/
│   ├── splits/
│   ├── dashboard/
│   └── api/
└── docs/                   # Documentation
```

---

## Deployment Notes

- **Contract:** Dockerized cargo-near on Hetzner (avoids wasm validation issues)
- **Agent:** EigenCompute `ecloud app upgrade` flow
- **Frontend:** Vercel, points to `AGENT_BASE_URL`
