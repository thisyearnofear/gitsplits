# GitSplits Platform Vision

## Current: GitSplits Core

User-initiated application for compensating open source contributors via Farcaster and web interface.

```
User → @gitsplits → Analyze repo → Pay contributors (with optional approval)
```

**What:** Pay open source contributors
**Why:** Fair compensation, transparent splits
**Input:** GitHub repo URL
**Output:** Payment distribution
**Interface:** Farcaster + Web UI

**Current State:** All operations require explicit user commands. Approval workflows are available for sensitive operations (create, pay).

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

## Hybrid Sovereign Architecture

To achieve the vision of a "Verifiable Sovereign Agent" while leveraging the unique strengths of different TEE providers, GitSplits employs a **Hybrid "Brain + Muscle" Architecture**.

This approach solves the incompatibility between `dstack` (required for Shade Agents) and `EigenCompute` (required for EigenAI) by splitting the agent into two specialized roles.

### 1. The Controller (Phala + Shade)
**"The Sovereign CEO"**

*   **Role:** Identity, Governance, & Treasury.
*   **Infrastructure:** Phala Network (native `dstack` support).
*   **Responsibilities:**
    *   **Identity:** Holds the verifiable "code identity" (via `dstack` Quote).
    *   **Treasury:** Manages funds on NEAR and EVM chains via **Chain Signatures**.
    *   **Signer:** The only entity authorized to sign financial transactions.
    *   **Orchestrator:** Delegates heavy compute tasks to the Worker.

### 2. The Worker (EigenCompute)
**"The Intelligent Employee"**

*   **Role:** Heavy Compute, Data Indexing, & AI Inference.
*   **Infrastructure:** EigenCompute TEE.
*   **Responsibilities:**
    *   **GitHub Indexing:** Fetches and processes thousands of commits.
    *   **EigenAI Inference:** Uses the deTERMinal grant to run verifiable LLM inference.
    *   **Attestation:** Signs analysis reports with its TEE-injected key.

---

## Workflow Protocol

1.  **Request:** User asks `@gitsplits` (The Controller) to split funds for `owner/repo`.
2.  **Delegation:** Controller verifies the request and dispatches a job to the Worker.
3.  **Execution:** Worker (Eigen) wakes up:
    *   Scrapes GitHub data.
    *   Calls EigenAI for "Fair Split" analysis.
    *   Generates a JSON Report: `{ "alice": 60, "bob": 40 }`.
    *   **Signs** the report with its Eigen-injected private key.
4.  **Verification:** Controller (Phala) receives the signed report.
    *   Verifies the signature against the known "Worker Whitelist" in the smart contract.
5.  **Settlement:** Controller uses **Chain Signatures** to distribute funds to contributors.

---

## Roadmap

### Phase 1: GitSplits Core ✅ (Complete)
**Deliverables:**
- ✅ Intent-based agent framework
- ✅ Farcaster integration
- ✅ GitHub analysis via GitHub App
- ✅ NEAR contract for splits
- ✅ EigenCloud TEE deployment

### Phase 2: Hybrid Sovereign Migration (Current)
**Goal:** Split the monolith into Controller/Worker roles to enable true sovereignty.

**Tasks:**
1.  **Refactor Agent Codebase:**
    *   Consolidate logic into a single modular repo.
    *   Implement `MODE=controller` (Phala) and `MODE=worker` (Eigen).
2.  **Deploy Controller (Phala):**
    *   Integrate `dstack` for identity.
    *   Connect to NEAR Chain Signatures.
3.  **Downgrade Worker (Eigen):**
    *   Remove direct payment logic.
    *   Expose "Signed Analysis" endpoint.
4.  **Bridge Contract:**
    *   Add `verify_worker` logic to the main contract.

### Phase 3: Marketplace & Expansion (Q3 2026)
**Goal:** Open the platform for other agents.

**Agents:**
- `gitsplits` - Contributor compensation
- `private-reviewer` - Security audits (Worker-heavy)
- `security-guardian` - Continuous monitoring

---

## Resources

- [Shade Agents Documentation](https://docs.near.org/ai/shade-agents/getting-started/introduction)
- [Chain Signatures](https://docs.near.org/concepts/abstraction/chain-signatures)
- [EigenCompute](https://eigencloud.xyz/)
