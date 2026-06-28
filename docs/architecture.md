# GitSplits Architecture

## Overview

GitSplits is an enterprise OSS funding platform with two execution planes:

1. **UiPath Maestro** — the orchestration & governance plane. A Maestro Case
   moves a sponsor's funding request through stages, calls the right actor at
   each step (UiPath Agent Builder, Action Center, external LangChain agent,
   or the GitSplits controller), and produces an auditable trail.
2. **GitSplits Controller** — the tool & state plane. A typed `/v1` REST API
   over GitHub analysis, NEAR splits, Ping Pay / HOT Pay payouts, EigenAI
   verifiable inference, and TEE attestation.

```
Sponsor → Maestro Case ─┬─→ UiPath Agent Builder agents
                        ├─→ LangChain Repo Insight Agent (external framework)
                        ├─→ Controller /v1 API (NEAR + Ping/HOT + EigenAI + TEE)
                        ├─→ Action Center (Finance / Compliance / Disputes)
                        └─→ TEE Attestation (EigenCompute / Phala dstack)
```

A legacy intent-parser entry point (`/process`, Farcaster webhook, web `/agent`)
remains available for the consumer-facing chat surface, but is not part of the
hackathon submission.

## Components

### 1. UiPath Maestro orchestration (`docs/maestro/`)

| File | Purpose |
|---|---|
| `case-definition.yaml` | 7-stage case + 5 exception lanes — Intake → Repo Analysis → Verification Check → Compliance & Approval → Split Creation → Payout Execution → Reconciliation & Attestation → Closure |
| `api-workflows.yaml` | One workflow per `/v1` controller endpoint plus stubs for sanctions, email, repo criticality |
| `agent-builder-agents.yaml` | `intake_triage_agent` and `approval_routing_agent` (model, prompts, schemas, guardrails) |

The case is paste-ready: import `packages/controller-phala/openapi.yaml` into
UiPath API Workflows and 12 of the 18 referenced workflows are auto-generated.

### 2. LangChain Repo Insight Agent (`packages/insight-agent/`)

Python service (FastAPI + LangChain) that wraps the controller and executes a
4-step reasoning chain for every funding request:

1. `client.analyze_repo` → fetch commit-based contributor breakdown
2. `client.insight_repo` → fetch attested EigenAI quality scores
3. **Critique** LLM step → surface bot inflation, concentration, gaming patterns
4. **Recommend** LLM step → produce structured allocation, risk flags, sponsor summary, confidence

Exposes `POST /insight/recommend`, called by the Repo Analysis stage of the
case. Claude (Anthropic) is the default LLM with an OpenAI fallback toggle.

### 3. Controller v1 REST adapter (`packages/controller-phala/src/http/v1/`)

Typed, Zod-validated JSON endpoints designed to be called by orchestrators (not
by chat UIs). Each endpoint maps onto a single tool action:

| Endpoint | Wrapped tool |
|---|---|
| `POST /v1/repo/analyze` | `githubTool.analyze` |
| `POST /v1/repo/insight` | `eigenaiTool.analyzeContributions` |
| `POST /v1/verification/check` | `nearTool.getVerifiedWallet` |
| `POST /v1/verification/store` | `nearTool.storeVerification` |
| `POST /v1/reputation/evaluate` | `reputationTool.evaluatePayoutEligibility` |
| `POST /v1/split/{get,create,update}` | `nearTool.{getSplit,createSplit,updateSplit}` |
| `POST /v1/payout/distribute` | `paymentOrchestratorTool.distribute` |
| `POST /v1/payout/pending` | `nearTool.storePendingDistribution` |
| `POST /v1/pending/list` | `nearTool.getPendingDistributions` |
| `POST /v1/attest/distribution` | `teeWalletTool.signMessage` |

Auth: `x-agent-api-key` header (matches `AGENT_SERVER_API_KEY`).
Schema source-of-truth: `packages/controller-phala/openapi.yaml`.

### 4. Controller tool layer (`packages/controller-phala/src/tools/`)

| Tool | Purpose |
|---|---|
| `github` | `@octokit/rest` — App or PAT auth; repo analysis, gist verification |
| `near` | `near-api-js` — splits registry, verification map, pending claims |
| `pingpay` / `hotpay` | NEAR Intents + HOT Partner API for payouts |
| `eigenai` | Attested AI inference for repo insight |
| `reputation` | Local heuristics + optional ERC-8004 + external API |
| `tee-wallet` | viem account derived from EigenCompute `MNEMONIC` env var |

### 5. Smart contract (`contracts/near/`)

- Split registry: `create_split`, `update_split`, `get_split_by_repo`
- Public verification map: `github_username <-> near wallet`
- Pending distribution records for unverified recipients
- Pagination/search helpers for the frontend mapping explorer

### 6. Web UI (`src/app/`)

| Path | Purpose |
|------|---------|
| `/` | Landing page with hackathon banner pointing to `/orchestration` |
| `/orchestration` | Maestro case visualization — the demo screenshot surface |
| `/dashboard` | Status, activity, recovery actions |
| `/verify` | GitHub gist + wallet verification flow |
| `/splits` | Guided analyze → split → pay experience |
| `/agent` | Natural language assistant (legacy intent parser) |
| `/api/*` | Proxy + read endpoints |

### 7. Runtime

- **TEE attestation:** EigenCompute (current) → Phala dstack (target). See `PHALA_CUTOVER_RUNBOOK.md`.
- **Controller hosting:** Hetzner today, EigenCompute for hackathon demo.
- **Web UI:** Vercel, points at `AGENT_BASE_URL` / `CONTROLLER_URL`.

---

## Maestro Case flow

```
                    ┌─────────────────────────────┐
                    │  INTAKE                     │
                    │  Agent Builder triage       │
                    └──────────────┬──────────────┘
                                   ▼
                    ┌─────────────────────────────┐
                    │  REPO ANALYSIS              │
                    │  LangChain agent            │
                    │  + EigenAI attestation      │
                    └──────────────┬──────────────┘
                                   ▼
                    ┌─────────────────────────────┐
                    │  VERIFICATION CHECK         │
                    │  Controller /v1/verification│
                    └──────┬────────────────┬─────┘
                  verified │                │ unverified
                           │                ▼
                           │   ╔═══════════════════════════╗
                           │   ║ SUB-CASE: Contributor    ║
                           │   ║ Outreach (parallel)      ║
                           │   ╚═══════════════════════════╝
                           ▼
                    ┌─────────────────────────────┐
                    │  COMPLIANCE & APPROVAL      │
                    │  Sanctions API + Action     │
                    │  Center (Finance/Compliance)│
                    └──────────────┬──────────────┘
                                   ▼
                    ┌─────────────────────────────┐
                    │  SPLIT CREATION             │
                    │  Controller → NEAR contract │
                    └──────────────┬──────────────┘
                                   ▼
                    ┌─────────────────────────────┐
                    │  PAYOUT EXECUTION           │
                    │  Ping Pay / HOT Pay         │
                    │  (retry → payout_failed     │
                    │   exception lane)           │
                    └──────────────┬──────────────┘
                                   ▼
                    ┌─────────────────────────────┐
                    │  RECONCILIATION & ATTEST    │
                    │  Verify receipts + TEE sig  │
                    └──────────────┬──────────────┘
                                   ▼
                    ┌─────────────────────────────┐
                    │  CLOSURE                    │
                    │  Sponsor notify + archive   │
                    └─────────────────────────────┘

Exception lanes (triggerable from any stage):
  malformed_intake · no_payable_contributors · compliance_blocked
  payout_failed   · dispute_raised
```

---

## Surface-area split

| Concern | Plane | Why |
|---|---|---|
| Stage transitions, SLAs, escalation | Maestro | Native case-management primitive |
| Human approvals & dispute review | Maestro (Action Center) | Replaces custom `advisor`/`draft` modes |
| Intake triage, approver routing | Maestro (Agent Builder) | UiPath-native, easy to govern |
| Multi-step repo reasoning | External (LangChain) | "External framework" judging note |
| GitHub / NEAR / payouts / TEE signing | Controller `/v1` | Stateful tool calls, kept narrow |
| Audit trail | Maestro case timeline | One source of truth for finance/compliance |

The controller never decides *what* to do next; Maestro does. The controller
only executes the action it's asked to.

---

## Environment Model

### Controller (`packages/controller-phala/.env`)

```bash
AGENT_MODE=production
PORT=3000
AGENT_SERVER_API_KEY=...          # protects /v1/* and /process

GITHUB_APP_ID=...
GITHUB_PRIVATE_KEY=...
GITHUB_TOKEN=...                  # optional fallback

NEAR_ACCOUNT_ID=...
NEAR_PRIVATE_KEY=...
NEAR_CONTRACT_ID=lhkor_marty.near
NEAR_NETWORK_ID=mainnet

PING_PAY_API_KEY=...
PING_PAY_WEBHOOK_SECRET=...
HOT_PAY_JWT=...

EIGENAI_WALLET_PRIVATE_KEY=0x...
EIGENAI_WALLET_ADDRESS=0x...
```

### LangChain Insight Agent (`packages/insight-agent/.env`)

```bash
CONTROLLER_BASE_URL=http://localhost:3000
CONTROLLER_API_KEY=...
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=...
ANTHROPIC_MODEL=claude-sonnet-4-6
INSIGHT_AGENT_PORT=8088
```

### Web UI

```bash
AGENT_BASE_URL=https://agent.gitsplits.thisyearnofear.com
CONTROLLER_URL=...
AGENT_API_KEY=...
NEXT_PUBLIC_PROJECT_ID=...
NEXT_PUBLIC_CONTRACT_ID=lhkor_marty.near
```

### UiPath (set as Maestro / Orchestrator Assets, not in code)

```
controller_base_url      → https://agent.gitsplits.thisyearnofear.com
controller_api_key       → matches AGENT_SERVER_API_KEY
insight_agent_base_url   → https://insight.gitsplits.thisyearnofear.com
gitsplits_owner_account  → e.g. lhkor_marty.near
```

---

## Readiness contract

| Endpoint | Purpose |
|---|---|
| `/ready` | Fails when production dependencies invalid (used by Maestro health checks) |
| `/health` | Service-level status |
| `/v1/*` | Structured business endpoints — see OpenAPI spec |

`/ready` validates: GitHub App creds, NEAR signer + contract config, Ping/HOT
auth, EigenAI grant wallet, optional TEE attestation source.

---

## File structure

```
gitsplits/
├── packages/
│   ├── controller-phala/
│   │   ├── src/
│   │   │   ├── index.ts            # HTTP server entry
│   │   │   ├── http/v1/            # Structured Maestro-facing endpoints
│   │   │   │   ├── router.ts
│   │   │   │   ├── schemas.ts      # Zod request schemas
│   │   │   │   └── handlers/       # repo, verification, split, payout, attest, ...
│   │   │   ├── intents/            # Legacy NL intents (still serve /process)
│   │   │   ├── tools/              # github, near, pingpay, hotpay, eigenai, tee-wallet
│   │   │   └── agentic/            # planner, payment-orchestrator, safety, telemetry
│   │   ├── openapi.yaml            # OpenAPI 3.0 spec for /v1
│   │   └── Dockerfile.eigen        # TEE container
│   ├── insight-agent/              # Python LangChain agent
│   │   ├── src/insight_agent/
│   │   │   ├── client.py
│   │   │   ├── chain.py            # 4-step reasoning chain
│   │   │   ├── llm.py              # Anthropic / OpenAI factory
│   │   │   ├── server.py           # FastAPI server
│   │   │   └── schemas.py
│   │   └── requirements.txt
│   ├── shared/                     # TS types shared across packages
│   └── legacy-worker/              # Pre-monolith worker (retained for cutover)
├── contracts/near/                 # Rust smart contract
├── docs/
│   ├── HACKATHON.md                # Enterprise framing pitch
│   ├── MAESTRO.md                  # UiPath wire-up guide
│   ├── DEMO_SCRIPT.md              # 5-minute storyboard
│   ├── ARCHITECTURE.md             # This document
│   └── maestro/
│       ├── case-definition.yaml
│       ├── api-workflows.yaml
│       └── agent-builder-agents.yaml
└── src/app/                        # Next.js web UI
    ├── orchestration/              # Maestro case visualization
    ├── agent/                      # Legacy chat
    ├── verify/  splits/  dashboard/
    └── api/
```

---

## Deployment notes

- **Contract:** Dockerized cargo-near on Hetzner (avoids wasm validation issues).
- **Controller:** EigenCompute `ecloud app upgrade` flow; Hetzner fallback.
- **Insight agent:** Containerized FastAPI (Uvicorn). Trivial to host anywhere with network reach to the controller.
- **Frontend:** Vercel, points at `CONTROLLER_URL`.
- **UiPath:** Maestro Studio Web + Agent Builder + Action Center on UiPath Automation Cloud.
