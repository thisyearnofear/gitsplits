# GitSplits Platform Vision

## Current: GitSplits Core

Autonomous agent for compensating open source contributors via Farcaster.

```
User → @gitsplits → Analyze repo → Pay contributors
```

**What:** Pay open source contributors  
**Why:** Fair compensation, transparent splits  
**Input:** GitHub repo URL  
**Output:** Payment distribution  
**Interface:** Farcaster + Web UI

---

## Expanded: Verifiable Compute Platform

EigenCompute-powered agents for sensitive operations that require trust.

### Use Case 2: Private Code Review

**What:** Security audit without exposing code  
**Why:** Teams need audits but can't share IP  
**Input:** Private codebase upload  
**Output:** Audit report (backdoors, exploits)  
**Interface:** Web UI

**Flow:**
1. User uploads private codebase to web UI
2. Code encrypted and sent to EigenCompute TEE
3. Security agent analyzes for vulnerabilities
4. Audit report generated
5. Code never leaves TEE, no human sees it

### Use Case 3: Continuous Security Agent

**What:** Ongoing security monitoring  
**Why:** Continuous audits without IP exposure  
**Input:** Codebase + update stream  
**Output:** Security alerts, reports  
**Interface:** API + Dashboard

**Features:**
- GitHub integration (private repos)
- Automated scans on every commit
- Alert system for new vulnerabilities
- Compliance reporting

---

## Shared Infrastructure

All use cases share:

```
┌─────────────────────────────────────────┐
│         EigenCloud EigenCompute          │
│  - TEE container with attestation        │
│  - Chain signatures for verification     │
│  - AVS backing for slashing              │
└─────────────────────────────────────────┘
                   │
    ┌──────────────┼──────────────┐
    ▼              ▼              ▼
┌────────┐    ┌────────┐    ┌────────┐
│GitSplits│    │Private │    │Security│
│ Agent   │    │Reviewer│    │ Agent  │
│         │    │        │    │        │
│Farcaster│    │Web UI  │    │API     │
│interface│    │upload  │    │access  │
└────────┘    └────────┘    └────────┘
```

---

## Roadmap

### Phase 1: GitSplits Core ✅ (NEARCON - Feb 16)

**Deliverables:**
- ✅ Intent-based agent framework
- ✅ Farcaster integration
- ✅ GitHub analysis via GitHub App
- ✅ NEAR contract for splits
- ✅ Ping Pay integration
- ✅ EigenCloud TEE deployment

### Phase 2: Platform Extraction (Post-NEARCON)

**Goal:** Extract reusable components for new use cases

**Components to generalize:**
1. **TEE Agent Framework** - Run any agent in EigenCompute
2. **Intent Parser** - Natural language → structured commands
3. **Attestation Service** - Prove execution happened in TEE
4. **Payment Rail** - Cross-chain distribution via Ping Pay

### Phase 3: Private Code Review (March 2026)

**New Agent:** `private-reviewer`  
**Interface:** Web UI (not Farcaster - too sensitive for public)  
**Pricing:** Per audit, paid via crypto

### Phase 4: Continuous Security Agent (Q2 2026)

**New Agent:** `security-guardian`

### Phase 5: Marketplace (Q3 2026)

**Goal:** Platform for verifiable compute agents

**Agents:**
- `gitsplits` - Contributor compensation
- `private-reviewer` - Security audits
- `security-guardian` - Continuous monitoring
- `compliance-auditor` - Regulatory checks
- `ip-protector` - License verification

**Infrastructure:**
- Agent registry
- TEE orchestration
- Payment routing
- Attestation verification

---

## Why This Timeline?

### NEARCON Focus (Now)
- **Judges want working demos**, not visions
- **Single strong product** > multiple incomplete ones
- **GitSplits alone** is a complete, impressive demo
- **EigenCloud integration** is already complex enough

### Post-NEARCON Expansion
- **Proven tech** - GitSplits validates the approach
- **Reusable components** - Agent framework, TEE deployment
- **Natural extension** - Same infra, different use case
- **Bigger market** - Security audits > contributor payments

---

## Technical Preparation

**During GitSplits build, prepare for expansion:**

1. **Modular agent framework** - Easy to add new intents
2. **Generic TEE wrapper** - Any agent can run in EigenCompute
3. **Pluggable interfaces** - Farcaster, Web, API
4. **Attestation library** - Reusable proof generation

---

## Shade Agents Migration (Planned)

### Current Status

GitSplits is deployed on **EigenCompute** as a TEE-powered agent with:
- Verifiable execution via TEE attestations
- Hardware-secure computation
- Privacy for sensitive operations

### What Are Shade Agents?

[Shade Agents](https://docs.near.org/ai/shade-agents/getting-started/introduction) combine:
- **TEE** — Verifiable, secure compute
- **NEAR Chain Signatures** — Decentralized key management
- **Agent Smart Contracts** — Persistent accounts across TEE instances

### Comparison

| Aspect | Current GitSplits | Shade Agent |
|--------|------------------|-------------|
| Key Management | Standard NEAR keys in TEE | Decentralized via chain signatures |
| Persistence | Keys lost if TEE fails | Persistent across any TEE instance |
| Multi-chain | NEAR primary | Any chain (EVM, Solana, Bitcoin) |
| Resilience | Single TEE instance | Multiple instances can share state |

### Migration Benefits

1. **Resilience** — If TEE goes down, another instance takes over
2. **Multi-chain Native** — Sign transactions on any blockchain
3. **True Decentralization** — Anyone can run agent Docker image
4. **Upgradability** — Code hash updates via DAO/timelock

### Migration Requirements

1. **Deploy Shade Agent Contract** (Rust)
   - Agent registration with attestation verification
   - Code hash approval mechanism
   - `request_signature` function for chain signatures

2. **Integrate `shade-agent-api`**
   - Replace direct NEAR key usage
   - Call agent contract for transaction signing
   - Register on boot with TEE attestation

3. **Restructure Agent State**
   - Move state from agent memory to contract
   - Ensure stateless agent design
   - Enable multiple concurrent TEE instances

### Timeline

**Status:** Planned, not yet prioritized

Behind:
- Core payment functionality stabilization
- Farcaster bot reactivation
- Private repo analysis features

### Resources

- [Shade Agents Documentation](https://docs.near.org/ai/shade-agents/getting-started/introduction)
- [Chain Signatures](https://docs.near.org/concepts/abstraction/chain-signatures)
- [EigenCompute](https://eigencloud.xyz/)
