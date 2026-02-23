# GitSplits "Sovereign Monolith" Architecture

## Overview
To achieve true agentic sovereignty, high performance, and an intuitive user experience, GitSplits employs a **Sovereign Monolith** architecture. By consolidating the agent code onto a single TEE (Phala Network) and utilizing EigenAI as a stateless REST API, we eliminate middleman servers, reduce latency, and maximize verifiability.

- **The Monolith (Controller):** Runs entirely on **Phala Network (dstack)**. Handles identity, treasury, data indexing, and cross-chain signing.
- **The Intelligence (API):** **EigenAI (deTERMinal)**. Provides verifiable LLM inference via cryptographic signatures, requested directly by the Controller.

---

## 1. The Sovereign Agent (Phala + Shade)
**Role:** The "Ownerless CEO & Analyst"

The Agent is the public face, legal identity, and data processor. It exists within a Shade-compatible TEE that provides a hardware-rooted cryptographic proof of its code hash.

- **Technology:** `dstack` SDK, Node.js, NEAR Chain Signatures.
- **Responsibilities:**
    - **Identity:** Maintains a stable, verifiable public key derived from its code hash.
    - **Data Extraction:** Scrapes and indexes GitHub repositories, commits, and PRs from *inside* the TEE (ensuring data hasn't been tampered with).
    - **Treasury Management:** Holds funds across multiple chains (NEAR, Ethereum, Base) using NEAR Chain Signatures.
    - **Execution:** Processes user requests, coordinates with the AI, and settles payouts.

---

## 2. The AI Provider (EigenAI)
**Role:** "Verifiable Intelligence API"

Because the Phala TEE has limited resources (cannot easily host massive models locally), the Agent calls out to EigenAI.

- **Technology:** EigenAI deTERMinal API.
- **Responsibilities:**
    - **Inference:** Analyzes contribution quality and suggests fair reward splits.
    - **Verifiability:** Returns a cryptographic signature alongside the completion, allowing the Agent to mathematically prove the AI output was not forged.

---

## 3. Communication Workflow

1.  **Request:** A user triggers a split request via Farcaster, GitHub, or the Web UI.
2.  **Indexing:** The **Agent** (in Phala) securely fetches the repository commits directly.
3.  **Analysis:** The **Agent** sends the sanitized commit data to the **EigenAI API**.
4.  **Verification:** EigenAI returns the split recommendation + a cryptographic signature. The Agent verifies this signature.
5.  **Settlement:** The **Agent** uses **NEAR Chain Signatures** to trustlessly execute payouts on the target chain (Ethereum, NEAR, Base) based on the AI's verified recommendation.

---

## 4. Why This Architecture Wins

| Priority | How We Achieve It |
| :--- | :--- |
| **Sovereignty** | Phala generates standard SGX quotes required by smart contracts (unlike EigenCompute, which relies on proprietary abstraction). |
| **Verifiability** | The data is indexed inside a hardware TEE (Phala). The analysis is signed by a specialized AI network (EigenAI). End-to-end trustless. |
| **Performance** | Only one backend server (`UI -> Phala -> UI`). No waking up secondary "Worker" nodes. |

### The Pivot from Dual-Stack
Originally, the project relied on an EigenCompute worker node. By realizing EigenAI is a stateless API, we deleted the EigenCompute server. The Phala Agent holds the `EIGENAI_WALLET_PRIVATE_KEY` securely in its TEE and queries the API directly, slashing complexity and latency.

---

## 5. Development Roadmap

### Phase 1: Controller Unification (Completed)
- [x] Initialize Sovereign Controller project (`packages/controller-phala`).
- [x] Migrate `github` and `eigenai` tools directly into the Controller.
- [x] Implement NEAR Chain Signatures for multi-chain payouts.

### Phase 2: Codebase Consolidation (Completed)
- [x] Delete `packages/worker-eigen` to completely remove the middleman infrastructure.
- [x] Update frontend routing to point directly to the Phala Controller.
- [x] Unify agentic reasoning (planning, telemetry, policy) in the monolith.

### Phase 3: Deployment & Testing
- [ ] Deploy the Monolith Agent to a live Phala dstack node.
- [ ] End-to-end testing of the "Request -> Analyze -> Pay" loop on testnet.

Current deployment note:
- Production traffic currently routes through the Hetzner-hosted controller.
- Phala dstack remains the target runtime for attested controller execution.

---

## Core Principles Adherence
- **CONSOLIDATION:** Deleted the entire `worker-eigen` package. Eliminated unnecessary server hops.
- **DRY:** Single source of truth for all shared logic (`@gitsplits/shared`).
- **CLEAN:** Clear separation between standard agent reasoning and external stateless APIs.
- **PERFORMANT:** Reduced network latency by centralizing the orchestration.
