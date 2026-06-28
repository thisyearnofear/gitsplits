# GitSplits — Enterprise OSS Funding, Orchestrated

> **UiPath AgentHack 2026 — Track 1: Maestro Case** submission.
>
> End-to-end agentic orchestration for sponsoring open-source contributors:
> intake → AI-driven repo analysis → contributor verification → compliance & approval →
> on-chain split creation → multi-rail payout → TEE-attested reconciliation. Built on
> the UiPath Platform with external LangChain agents and a TEE-attested execution
> service. Scaffolded with Claude Code (UiPath for Coding Agents).

---

## What this is

Open-source software underwrites the global economy and almost nobody pays for it.
Log4j cost $90B+, OpenSSL ran on one unpaid developer until Heartbleed, xz-utils
showed what happens when burnt-out maintainers hand over the keys. Every Fortune
500 with a serious dependency tree wants to fund OSS the way they fund vendors —
with case workflows, approval matrices, sanctions screening, and audit trails.

GitSplits turns "we should pay the maintainers of [critical dependency]" into a
fully orchestrated, auditable case:

1. A sponsor submits a funding request (email, web form, Slack).
2. A UiPath **Maestro Case** routes it through stages — repo analysis, verification,
   sanctions screening, approval, split creation, payout, reconciliation.
3. Each stage calls the right actor: **Agent Builder** agents handle intake triage and
   approval routing, an external **LangChain** agent does multi-step repo reasoning,
   the **GitSplits controller** writes splits on NEAR and disburses via Ping Pay / HOT
   Pay, and **Action Center** holds humans accountable at the right decision points.
4. The case closes with a TEE-signed attestation, EigenAI explorer link, and full
   audit trail — the exact evidence finance and compliance need.

**Agents autonomous where appropriate, humans accountable for high-impact decisions.**
The Approval Routing Agent assigns one of four autonomy tiers per request:

| Tier | Trigger | Human approvers |
|---|---|---|
| T0 | ≤ $500, no risk flags | **None** — closes in <5 min, fully autonomous |
| T1 | $501–$5,000 | 1 finance signature |
| T2 | $5,001–$25,000 or warning flag | finance + compliance |
| T3 | > $25,000, high-criticality repo, or blocker flag | finance + compliance + exec sponsor |

Sanctions hits, contributor disputes, and payout failures always escalate to a
human regardless of tier. See [HACKATHON.md → Autonomy profile](docs/HACKATHON.md#autonomy-profile--agents-where-appropriate-humans-where-it-matters)
for the rationale.

```
Sponsor → Maestro Case ─┬─→ Intake Triage Agent (UiPath Agent Builder)
                        ├─→ LangChain Repo Insight Agent (external framework)
                        ├─→ GitSplits Controller v1 API (NEAR + Ping/HOT + EigenAI)
                        ├─→ Action Center (Finance / Compliance / Disputes)
                        └─→ TEE Attestation (EigenCompute / Phala dstack)
```

## UiPath components used

| Capability | Where it lives | What it does |
|---|---|---|
| **Maestro Case** | `docs/maestro/case-definition.yaml` | 7 stages + 5 exception lanes orchestrating the full funding flow |
| **Agent Builder** | `docs/maestro/agent-builder-agents.yaml` | `intake_triage_agent` + `approval_routing_agent` (native UiPath agents) |
| **API Workflows** | `docs/maestro/api-workflows.yaml` + `packages/controller-phala/openapi.yaml` | One workflow per `/v1` controller endpoint; import the OpenAPI spec to auto-generate 12 of them |
| **Action Center** | Case definition (finance approval, compliance review, dispute review, payout recovery) | Human-in-the-loop tasks at every sensitive decision |
| **Integration Service** | API workflow stubs in `docs/maestro/api-workflows.yaml` | Sponsor notifications, sanctions screening, repo criticality lookups |

## External agents & services

| Component | Role | Code |
|---|---|---|
| **LangChain Repo Insight Agent** | Multi-step reasoning (fetch → AI quality scores → critique → recommend). Counts toward the "external framework" judging note. | `packages/insight-agent/` |
| **GitSplits Controller** | Typed v1 REST API wrapping GitHub, NEAR, Ping Pay, HOT Pay, EigenAI, and TEE attestation. | `packages/controller-phala/` |
| **NEAR Smart Contract** | Splits registry, verification mapping, pending claims. | `contracts/near/` |
| **EigenAI deTERMinal** | Attested AI inference; signature attached to every analysis. | Called from controller `/v1/repo/insight` |
| **EigenCompute / Phala dstack** | TEE runtime that signs the final case attestation. | `packages/controller-phala/Dockerfile.eigen` |

## Coding agents disclosure (bonus points)

This submission was scaffolded with **Claude Code** (an Opus 4.7 powered CLI),
invoked through the UiPath for Coding Agents pattern. Specifically:

- The v1 REST adapter (`packages/controller-phala/src/http/v1/*`) and its OpenAPI spec
  were generated and validated by Claude Code.
- The LangChain insight agent (`packages/insight-agent/`) was scaffolded end-to-end
  by Claude Code, including the multi-step chain and FastAPI server.
- The Maestro case definition, API workflow catalog, and Agent Builder specs in
  `docs/maestro/` were produced by Claude Code from the architecture diagram.

The demo video shows Claude Code generating these artifacts live.

## Quick start

```bash
# 1. Clone
git clone https://github.com/thisyearnofear/gitsplits && cd gitsplits

# 2. Controller (Node 20+)
npm install
npm run build:shared
cd packages/controller-phala
cp .env.example .env  # fill in NEAR + GitHub + Ping/HOT + EigenAI creds
AGENT_MODE=mock npx tsx src/index.ts   # serves /v1/* on :3000

# 3. LangChain insight agent (Python 3.11+)
cd ../insight-agent
pip install -r requirements.txt
cp .env.example .env  # CONTROLLER_BASE_URL + ANTHROPIC_API_KEY
python -m insight_agent.server  # serves /insight/recommend on :8088

# 4. UiPath Maestro (requires UiPath Labs / Automation Cloud access)
#    See docs/MAESTRO.md for the import + wire-up steps.
#    For repeatable deploys, bundle as a .uipx solution:
#      npm install -g @uipath/cli && uip login
#      uip solution init gitsplits-funding
#    (Full lifecycle in docs/maestro/solution.yaml)
```

## Documentation

| Doc | What's in it |
|---|---|
| [**HACKATHON.md**](docs/HACKATHON.md) | Enterprise problem framing, persona, judging-criteria mapping |
| [**MAESTRO.md**](docs/MAESTRO.md) | Maestro case design, agent specs, OpenAPI import flow |
| [**ARCHITECTURE.md**](docs/ARCHITECTURE.md) | System design including the Maestro orchestration layer |
| [**DEMO_SCRIPT.md**](docs/DEMO_SCRIPT.md) | 5-minute demo storyboard + links to the silent reference recordings in `docs/demo/` |
| [**SETUP.md**](docs/SETUP.md) | Developer setup, deployment, contract details |
| [**GUIDE.md**](docs/GUIDE.md) | Commands and end-user usage reference |
| [**PHALA_CUTOVER_RUNBOOK.md**](docs/PHALA_CUTOVER_RUNBOOK.md) | Staged migration from Hetzner runtime to Phala dstack |
| [**PLATFORM.md**](docs/PLATFORM.md) | Roadmap |
| [**LABS_ACCESS_REQUEST.md**](docs/LABS_ACCESS_REQUEST.md) | Draft answers for the UiPath Labs access form |
| [`docs/maestro/solution.yaml`](docs/maestro/solution.yaml) | `.uipx` solution manifest — projects, assets, queues, deploy configs, `uip solution` CLI lifecycle |
| [`docs/maestro/*.yaml`](docs/maestro) | Paste-ready case/workflow/agent definitions |
| [`packages/controller-phala/openapi.yaml`](packages/controller-phala/openapi.yaml) | OpenAPI 3.0 spec for the controller v1 API — import directly into UiPath API Workflows |

## Repository layout

```
gitsplits/
├── packages/
│   ├── controller-phala/         # Node controller: /v1 REST API + tools + TEE wallet
│   │   ├── src/http/v1/          # Structured endpoints (Maestro-friendly)
│   │   └── openapi.yaml          # Import into UiPath API Workflows
│   ├── insight-agent/            # Python LangChain agent (external framework)
│   │   └── src/insight_agent/    # client.py, chain.py, server.py, schemas.py
│   ├── shared/                   # TS types shared across packages
│   └── legacy-worker/            # Pre-monolith worker; retained for cutover
├── contracts/near/               # Rust smart contract: splits + verification map
├── docs/
│   ├── HACKATHON.md              # Pitch
│   ├── MAESTRO.md                # UiPath wire-up guide
│   ├── DEMO_SCRIPT.md            # 5-min demo storyboard
│   ├── LABS_ACCESS_REQUEST.md    # Draft for the UiPath Labs access form
│   ├── ARCHITECTURE.md           # System design
│   └── maestro/                  # Case, workflow, and agent specs (paste-ready)
└── src/                          # Next.js web app (sponsor portal + /orchestration)
```

## Hackathon submission checklist

- [x] Public GitHub repo with MIT license
- [x] All UiPath components listed in README (Maestro Case, Agent Builder, API Workflows, Action Center, Integration Service)
- [x] Coding-agent usage disclosed
- [x] OpenAPI spec for one-click UiPath API Workflow import
- [x] External framework (LangChain) integrated as part of the case flow
- [ ] Demo video uploaded (silent reference clips ready in [docs/demo/](docs/demo/); script in [DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md))
- [ ] Devpost project page filled out
- [ ] Presentation deck shared
- [ ] UiPath Labs access provisioned (draft ready in [LABS_ACCESS_REQUEST.md](docs/LABS_ACCESS_REQUEST.md), submit ASAP)

## License

MIT — see [LICENSE](LICENSE).
