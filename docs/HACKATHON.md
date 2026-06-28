# GitSplits — UiPath AgentHack 2026 Submission

> **Track 1: UiPath Maestro Case**
> *Enterprise OSS Funding, Orchestrated*

---

## The problem

Every enterprise depends on open-source software they don't pay for. The big ones —
banks, insurers, healthcare networks, government agencies — all want to fund the
critical libraries in their dependency tree. The blockers are almost never
philosophical:

- **No path through Finance & Compliance.** Paying ten contributors across as many
  jurisdictions trips procurement rules. Sanctions screening is mandatory. Audit
  trails must satisfy SOX, HIPAA, or sector-specific regulators.
- **Contributor identity is fuzzy.** Bot accounts inflate commit counts. Anon
  contributors have no wallet. Code review work isn't visible to a commit
  histogram. Splitting funds "fairly" requires AI judgment a spreadsheet can't make.
- **Approvals don't scale.** A $250 grant and a $25,000 grant need different
  approvers. A single static matrix can't account for repo criticality, risk
  flags, or sponsor tier.
- **Exceptions are the norm, not the exception.** Payouts fail. Contributors
  dispute splits. Compliance flags hit. Real OSS funding is exception-heavy.

The pattern fits Maestro Case management exactly: dynamic, exception-heavy
work that must coordinate agents, robots, humans, and APIs, with humans in
charge at every sensitive decision.

---

## The persona

**Maya, Director of Open Source Program Office (OSPO) at a Fortune 500 fintech.**

- Has a board mandate to fund the top 20 OSS dependencies of their core platform.
- Reports quarterly to Finance, Legal, and Risk on what was funded, to whom, why.
- Has a budget but no operational machinery — every funding request is a
  bespoke procurement project.
- Refuses to send a six-figure annual budget through "send tokens to a wallet
  in a Telegram bot." Needs the same audit posture as a vendor invoice.

GitSplits turns Maya's funding mandate from a slow, manual program into a
push-button workflow with the audit posture her CFO requires.

---

## The solution in one sentence

A sponsor's funding request becomes a UiPath Maestro Case that coordinates
AI-driven repo analysis, contributor verification, sanctions screening, multi-tier
approvals, on-chain split creation, multi-rail payout, and TEE-attested
reconciliation — with every step logged for audit.

---

## Why this maps to Track 1 (Maestro Case)

The hackathon brief calls out "dynamic, exception-heavy work that moves through
stages, involves handoffs between agents, robots, and people, and keeps humans
in charge at key decision points."

GitSplits is exactly that:

| Brief calls for... | We deliver... |
|---|---|
| Dynamic stages | 7 stages with conditional transitions per the funding amount, risk flags, and verification state |
| Handoffs between agents, robots, people | UiPath Agent Builder agents + LangChain external agent + Action Center humans + the GitSplits controller as a tool plane |
| Humans in charge at key decision points | Action Center tasks for Finance, Compliance, Disputes, and Payout Recovery |
| Exception-heavy work | 5 exception lanes covering malformed intake, no payable contributors, compliance blocks, payout failures, and disputes |
| Real-world business problem | OSS funding is a real, board-level concern in regulated enterprises |

A BPMN process (Track 2) would be the wrong fit: half the case is unpredictable
(verification timing, dispute frequency, payout retries). Test Cloud (Track 3) is
not the primary lens here — though our test approach validates AI-infused
workflows in passing.

---

## How we hit each judging criterion

### Business Impact & Adoption Potential
- Frames a real enterprise pain (OSS funding governance) that every large
  org has and most solve with spreadsheets and Slack threads today.
- Production-grade primitives: typed APIs, attested AI, TEE signatures,
  on-chain receipts, real payout rails (Ping Pay, HOT Pay).
- Scales by adding more sponsors and more approver queues — no architecture
  change needed.

### Platform Usage
- **Maestro Case** is the orchestration backbone, not a screenshot.
- **Two Agent Builder agents** handle intake triage and approver routing.
- **Twelve API Workflows** auto-import from our OpenAPI spec; four
  integration-service stubs cover email, sanctions, sponsor notifications,
  receipt verification.
- **Action Center** owns every human decision; replaces our prior custom
  advisor/draft approval modes.

### Technical Execution, Feasibility & Versatility
- Typed `/v1` REST adapter with Zod validation surfaces clean field-level errors
  to Maestro instead of cryptic 500s.
- Retry policy on payout with explicit `payout_failed` exception lane.
- Parallel sub-case for unverified contributors with SLA-bounded waits.
- TEE-signed attestations bind on-chain outcomes to the case audit trail.

### Completeness of Delivery
- Public MIT-licensed repo with full README, MAESTRO.md wire-up guide,
  ARCHITECTURE.md, and HACKATHON.md (this file).
- Working backend (`packages/controller-phala`) and external agent
  (`packages/insight-agent`) with smoke-tested endpoints.
- Maestro design specs in `docs/maestro/*.yaml` that translate
  directly onto Studio Web screens.

### Creativity & Innovation
- Combining a UiPath-native Agent Builder agent (routing), an external
  LangChain agent (reasoning), and an attested-AI service (EigenAI) in one
  case is an unusual orchestration pattern.
- TEE-signed case attestations attached to Maestro timeline — a novel use
  of confidential compute as a downstream tool, not the runtime.
- Sponsor-as-input rather than autonomous-action framing keeps humans in
  charge in a domain (payments) where they should be.

### Presentation
- 5-minute video walks through one case from intake to attestation with
  on-camera Claude Code usage.
- Code is signposted; another developer can clone, follow MAESTRO.md, and
  reproduce the wire-up.

### Coding Agents Bonus (UiPath for Coding Agents)
- Every artifact in `packages/controller-phala/src/http/v1/`,
  `packages/insight-agent/`, and `docs/maestro/*.yaml` was scaffolded
  by Claude Code (Opus 4.7).
- The demo video has a segment showing Claude Code generating one of these
  artifacts live.

---

## What's in this repo for the judges

1. **`README.md`** — Track positioning, components used, coding-agent disclosure, quick start.
2. **`docs/MAESTRO.md`** — Step-by-step wire-up from a fresh UiPath tenant to a running case.
3. **`docs/maestro/case-definition.yaml`** — The case design itself.
4. **`docs/maestro/api-workflows.yaml`** — Every API workflow, grouped by source.
5. **`docs/maestro/agent-builder-agents.yaml`** — The two native UiPath agents.
6. **`packages/controller-phala/openapi.yaml`** — Import once → 12 API workflows.
7. **`packages/insight-agent/`** — Python LangChain agent (external framework).
8. **`packages/controller-phala/src/http/v1/`** — Typed REST adapter.
9. **`src/app/orchestration/page.tsx`** — Visual demo surface for screenshots.

---

## What we'd build next (post-hackathon)

- **Sponsor portal** — A polished intake UI in this Next.js app that posts to a
  Maestro case-create endpoint, replacing the demo's curl invocation.
- **CMDB integration** — `lookup_repo_criticality` API workflow backed by a
  real dependency graph so the Approval Routing Agent can grade repos by
  business criticality, not just amount.
- **Multi-sponsor pooling** — Cases that combine funds from N sponsors into a
  single payout cycle, with sponsor-tier-weighted attribution.
- **Receipt portal for contributors** — A page where verified contributors can
  see their payout history with the linked TEE attestation, satisfying the
  "show me where this money came from" question for downstream tax filings.
