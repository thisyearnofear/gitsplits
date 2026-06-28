# UiPath Labs Access Request — Draft

> **Action:** Have the team representative open the access form on the
> AgentHack registration page and paste the answers below.
>
> **Status:** Draft. Submit ASAP — quoted turnaround is 3 business days,
> and the case build needs Labs to demo.
>
> **Owner:** _(team rep — fill in)_
>
> **Submission deadline:** _(2 weeks before demo deadline at the latest)_

---

## Team representative

| Field | Value |
|---|---|
| Full name | _(team rep)_ |
| Email | papaandthejimjams@gmail.com |
| Devpost username | _(team rep Devpost handle)_ |
| GitHub username | thisyearnofear |
| Team name | GitSplits |
| Team size | _(1–4)_ |
| Country / time zone | _(fill)_ |
| LinkedIn (optional) | _(fill)_ |

## Team members (other than rep)

| Name | Email | GitHub | Role |
|---|---|---|---|
| _(name)_ | _(email)_ | _(handle)_ | _(role)_ |

---

## Project

**Project name:** GitSplits — Enterprise OSS Funding, Orchestrated

**Track:** Track 1 — UiPath Maestro Case

**Public repository:** https://github.com/thisyearnofear/gitsplits

**One-line description:**
A UiPath Maestro Case that turns a sponsor's OSS funding request into a fully
orchestrated, audited transaction — intake triage, AI-driven repo analysis,
contributor verification, compliance and approval, on-chain split creation,
multi-rail payout, and TEE-attested reconciliation.

**Why Track 1 (Maestro Case) specifically:**
OSS funding is inherently exception-heavy work (unverified contributors,
sanctions hits, failed payouts, disputes) that requires humans in charge at
every sensitive decision. The 7 stages plus 5 exception lanes map cleanly onto
Maestro case management; a BPMN flow would force us to fake a tidy linear
sequence that doesn't reflect how the work actually unfolds.

---

## UiPath components we plan to use in Labs

| Component | Usage |
|---|---|
| **Maestro Studio Web** | Build and publish the "OSS Funding Request" case (7 stages, 5 exception lanes). See `docs/maestro/case-definition.yaml` in our repo. |
| **Agent Builder** | Two native agents — `intake_triage_agent` (parses sponsor email into structured fields) and `approval_routing_agent` (picks finance/compliance/exec approvers based on amount + risk flags). See `docs/maestro/agent-builder-agents.yaml`. |
| **API Workflows** | 12 wrappers auto-imported from our OpenAPI 3.0 spec (`packages/controller-phala/openapi.yaml`) + 1 external-agent workflow for our LangChain service + 4 integration stubs (email, sanctions, sponsor notify, receipt verify). See `docs/maestro/api-workflows.yaml`. |
| **Action Center** | Human tasks for finance approval, compliance review, dispute review, payout recovery, and the intake-repair / no-payable-contributors exception lanes. |
| **Integration Service** | Email outreach to unverified contributors, sponsor notifications. |
| **Orchestrator** | Asset storage for controller URL + API keys (we will NOT hard-code credentials in workflows). |

## External frameworks integrated (per the brief's encouragement)

| Component | Purpose | Repo location |
|---|---|---|
| **LangChain** | Multi-step Repo Insight Agent — fetch → critique → recommend. Runs as a FastAPI service called via API Workflow. | `packages/insight-agent/` |
| **Anthropic Claude** | Default LLM for the LangChain chain (`claude-sonnet-4-6`). | `packages/insight-agent/src/insight_agent/llm.py` |
| **EigenAI deTERMinal** | Attested AI inference for contributor quality scoring. | Called from controller `/v1/repo/insight` |
| **NEAR Protocol** | On-chain splits registry + verification map + pending claims. | `contracts/near/` |
| **Ping Pay / HOT Pay** | Multi-rail payout (NEAR Intents + HOT Partner API). | `packages/controller-phala/src/tools/{pingpay,hotpay}.ts` |
| **EigenCompute / Phala dstack** | TEE attestation of the final case payload. | `packages/controller-phala/src/tools/tee-wallet.ts` |

## Coding Agents (bonus)

We are using **Claude Code (Opus 4.7)** via the UiPath for Coding Agents pattern.
Every non-trivial artifact has been scaffolded by Claude Code, including:

- The controller's typed `/v1` REST adapter and OpenAPI spec (`packages/controller-phala/src/http/v1/`, `packages/controller-phala/openapi.yaml`).
- The LangChain Repo Insight Agent end-to-end (`packages/insight-agent/`).
- All three Maestro design specs (`docs/maestro/*.yaml`).

The demo video will show Claude Code generating one of these artifacts live.

---

## What we need from Labs

- A Maestro-enabled tenant (Maestro Studio Web + Action Center + Agent Builder + Orchestrator API Workflows).
- The agentic and AI units described in the AgentHack brief.
- Two user accounts so we can demo the sponsor and reviewer perspectives in Action Center during the recorded video.

## What we already have

- A working backend controller exposing a typed `/v1` REST API, smoke-tested in mock mode.
- A working LangChain agent that imports cleanly and exposes `/insight/recommend`.
- Three paste-ready design specs (case, workflows, agents) that translate directly onto Studio Web screens.
- A `/orchestration` page in our Next.js app that visualizes the case for the demo recording.
- Full documentation: `README.md`, `docs/MAESTRO.md` (wire-up guide), `docs/HACKATHON.md` (pitch), `docs/DEMO_SCRIPT.md` (5-min storyboard).

Everything is ready to be wired into the platform the moment access lands —
the gap between "we have access" and "we have a publishable case" should be
measured in days, not weeks.

---

## Likely access-form fields (best-guess)

These are common fields on UiPath partner / Labs forms. Have answers ready
so you can fill the form in one sitting:

1. **Use case category** → "Hackathon submission (UiPath AgentHack 2026 — Track 1)"
2. **Number of named users** → _(team size)_
3. **Estimated case throughput in Labs** → Low — single-tenant demo, ~20 case instances during build and recording
4. **PII / regulated data handling** → No real PII; demo uses synthetic sponsor data and public GitHub contributor information
5. **Integrations needed** → Custom REST connectors (our controller + LangChain agent), Integration Service for email
6. **External LLM usage** → Yes — Anthropic Claude (and EigenAI deTERMinal as a downstream attested-AI service)
7. **Production deployment plan** → Post-hackathon, depending on placement
8. **Expected access duration** → Through the AgentHack judging window plus 30 days for any post-finalist publishing
