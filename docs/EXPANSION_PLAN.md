# GitSplits Expansion Plan

## Phase 1: GitSplits Core (NEARCON Sandbox - Feb 16)

**Goal:** Working autonomous agent for contributor compensation

**Deliverables:**
- ✅ Intent-based agent framework
- ✅ Farcaster integration (@gitsplits bot)
- ✅ GitHub analysis via GitHub App
- ✅ NEAR contract for splits
- ✅ Ping Pay integration
- ✅ EigenCloud TEE deployment

**Demo:**
```
@gitsplits pay 100 USDC to near/near-sdk-rs
→ Analyzes repo
→ Distributes to verified contributors
→ Posts receipt on Farcaster
```

## Phase 2: Platform Extraction (Post-NEARCON)

**Goal:** Extract reusable components for new use cases

**Components to generalize:**
1. **TEE Agent Framework** - Run any agent in EigenCompute
2. **Intent Parser** - Natural language → structured commands
3. **Attestation Service** - Prove execution happened in TEE
4. **Payment Rail** - Cross-chain distribution via Ping Pay

## Phase 3: Private Code Review (March 2026)

**Goal:** Security audits without IP exposure

**New Agent:** `private-reviewer`

**Flow:**
```
1. User uploads private codebase to web UI
2. Code encrypted and sent to EigenCompute TEE
3. Security agent analyzes for:
   - Backdoors
   - Rug-pull patterns
   - Common exploits
   - Access control issues
4. Audit report generated
5. Code never leaves TEE, no human sees it
```

**Interface:** Web UI (not Farcaster - too sensitive for public)

**Pricing:** Per audit, paid via crypto

## Phase 4: Continuous Security Agent (Q2 2026)

**Goal:** Ongoing security monitoring

**New Agent:** `security-guardian`

**Features:**
- GitHub integration (private repos)
- Automated scans on every commit
- Alert system for new vulnerabilities
- Compliance reporting

## Phase 5: Marketplace (Q3 2026)

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

## Technical Preparation

**During GitSplits build, prepare for expansion:**

1. **Modular agent framework** - Easy to add new intents
2. **Generic TEE wrapper** - Any agent can run in EigenCompute
3. **Pluggable interfaces** - Farcaster, Web, API
4. **Attestation library** - Reusable proof generation

**This way:**
- GitSplits wins NEARCON
- Platform vision attracts follow-on funding
- Expansion is rapid because foundation is solid
