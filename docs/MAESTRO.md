# UiPath Maestro Wire-Up Guide

This is the operator's guide for taking the GitSplits codebase and standing
the solution up inside UiPath Automation Cloud for the hackathon demo.

The case design itself (stages, transitions, exception lanes, agent prompts,
workflow inputs) lives in `docs/maestro/*.yaml`. Those files are the
specification — this document is the *how to put them into UiPath*.

---

## Prerequisites

- UiPath Automation Cloud tenant (Labs or paid)
- Maestro Studio Web access
- UiPath Agent Builder access
- Action Center enabled
- Orchestrator with API Workflows enabled

If you don't have all of the above, see the **Labs access** section at the bottom.

---

## File map

| Artifact | Source file | Purpose |
|---|---|---|
| Solution manifest | `docs/maestro/solution.yaml` | How everything bundles into a `.uipx` deployable via `uip solution` CLI |
| Case definition | `docs/maestro/case-definition.yaml` | 7 stages + 5 exception lanes, paste-ready to translate into Maestro |
| API workflow catalog | `docs/maestro/api-workflows.yaml` | Every API workflow Maestro needs, grouped by source |
| Agent Builder specs | `docs/maestro/agent-builder-agents.yaml` | The two UiPath-native agents (intake triage, approval routing) |
| Controller OpenAPI spec | `packages/controller-phala/openapi.yaml` | OpenAPI 3.0 — import once and 12 workflows materialize |

---

## Step-by-step setup

### 1. Stand up the controller

Either deploy `packages/controller-phala` to your EigenCompute / Phala / Hetzner
endpoint (see `docs/SETUP.md`) or for the demo run it locally and expose via a
tunnel (`ngrok http 3000`).

Set `AGENT_SERVER_API_KEY` and note its value; you'll add it to UiPath Assets.

```bash
cd packages/controller-phala
cp .env.example .env  # fill in NEAR + GitHub + Ping/HOT + EigenAI creds
AGENT_MODE=production npx tsx src/index.ts
```

Verify with `curl https://<controller>/health` and `curl -X POST -H "x-agent-api-key: $KEY" https://<controller>/v1/verification/check -d '{"githubUsernames":["alice"]}'`.

### 2. Stand up the LangChain Insight Agent

```bash
cd packages/insight-agent
pip install -r requirements.txt
cp .env.example .env  # CONTROLLER_BASE_URL + ANTHROPIC_API_KEY
python -m insight_agent.server  # serves on :8088
```

Verify with `curl http://localhost:8088/health` and the CLI runner
(`packages/insight-agent/scripts/recommend.py near/near-sdk-rs`).

Expose the agent the same way as the controller for UiPath to reach it.

### 3. Create UiPath Assets

In Orchestrator → Assets, create these as **Credentials** (not plain text):

| Asset key | Value |
|---|---|
| `controller_base_url` | `https://<your-controller>` |
| `controller_api_key` | Matches your `AGENT_SERVER_API_KEY` |
| `insight_agent_base_url` | `https://<your-insight-agent>` |
| `gitsplits_owner_account` | e.g. `lhkor_marty.near` |

### 4. Import the controller OpenAPI as API Workflows

1. Maestro Studio Web → API Workflows → New from OpenAPI.
2. Paste the URL of `packages/controller-phala/openapi.yaml` (or upload the file).
3. Create the connection using the `controller_base_url` and `controller_api_key` Assets.
4. UiPath generates one workflow per operation. Verify all 12 are present:
   `analyzeRepo`, `insightRepo`, `checkVerification`, `storeVerification`,
   `evaluateReputation`, `getSplit`, `createSplit`, `updateSplit`,
   `distributePayout`, `storePendingPayout`, `listPending`, `attestDistribution`.
5. Rename them to match the keys in `docs/maestro/api-workflows.yaml` for clarity
   (`analyze_repo`, `check_verification`, etc.) — the case definition references
   workflows by those keys.

### 5. Create the external-agent API Workflow

Manually create one more API Workflow:

- Name: `langchain_insight_agent`
- Connection: `insight_agent_base_url` Asset
- Method: `POST`
- Path: `/insight/recommend`
- Body schema: `{ repo_url: string, sponsor_context: string, funding_amount_usd: number }`
- Response schema: see `packages/insight-agent/src/insight_agent/schemas.py` → `InsightResponse`

### 6. Create the integration workflow stubs

`docs/maestro/api-workflows.yaml` lists four integration workflows you need to
create using UiPath Integration Service connectors (no controller code involved):

- `send_verification_email` — Microsoft 365 / Gmail / SendGrid connector
- `sanctions_screen` — Chainalysis / TRM Labs / your provider
- `notify_sponsor` — email or Slack
- `verify_receipts` — generic HTTP GET to a public RPC

Use placeholder implementations for the demo if a real provider isn't available
(the case still proves out end-to-end).

### 7. Build the two Agent Builder agents

For each agent in `docs/maestro/agent-builder-agents.yaml`:

1. Agent Builder → New Agent.
2. Set model from the YAML (`provider`, `id`, `temperature`).
3. Paste the `system_prompt` into Instructions.
4. Define input/output schemas from the YAML's `inputs`/`outputs` blocks.
5. For `approval_routing_agent`, attach the `lookup_repo_criticality` workflow as a tool (optional — only if you create that CMDB lookup).
6. Add the guardrails from the YAML.
7. Test in the Agent Builder playground with a sample sponsor email.

### 8. Build the Maestro Case

Translate `docs/maestro/case-definition.yaml` into Maestro Studio Web:

1. Create a new Case named "OSS Funding Request".
2. Define case fields from the YAML's `fields:` section.
3. For each entry in `stages:`:
   - Create a stage with the name and key.
   - For each task, set the action type per the mapping in the YAML header
     (`api_workflow`, `agent_builder`, `external_agent`, `action_center`,
     `system`).
   - Wire inputs/outputs using the `{{case.<field>}}` references.
   - Add the transitions block.
4. For each entry in `exception_lanes:`, create an exception handler.
5. Set the case-level SLA (72h target).
6. Publish to your environment.

### 9. (Optional but recommended) Bundle as a UiPath Solution (.uipx)

For repeatable, environment-aware deploys, package everything as a single
`.uipx` solution rather than maintaining each piece by hand:

```bash
npm install -g @uipath/cli
uip login

# Initialize and register every project (case, agents, API workflows)
uip solution init gitsplits-funding
# … uip solution project add for each project in docs/maestro/solution.yaml

# Sync, pack, publish, deploy
uip solution resource refresh
uip solution pack
uip solution publish
uip solution deploy run -c hackathon-demo --parent-folder-path "Shared"

# Verify
uip solution deploy status --output json
```

The full project list, asset definitions, queue names, and deploy configs live
in `docs/maestro/solution.yaml`. Promote the same `.uipx` from `dev` to
`hackathon-demo` to `prod` via `-c <config-key>` rather than maintaining
parallel packages.

> **Critical**: never hand-edit `resources/solution_folder/` — it's
> auto-generated by `uip solution project add/import` and silent failures
> follow manual edits. Use the CLI as the source of truth.

### 10. Outbound IP allowlisting

UiPath API Workflows that call our controller and the LangChain insight agent
go out from UiPath's serverless robot pool. Before the first end-to-end run,
allow UiPath's outbound IPs on your edge (Cloudflare WAF / NGINX / load
balancer). Calls to UiPath-internal services (Orchestrator, Action Center)
need no allowlist configuration.

Find the current outbound IP ranges in your UiPath Automation Cloud tenant
settings → "Outbound traffic" or in the Studio Web API Workflows docs.

### 11. End-to-end smoke test

1. Trigger the case manually from Maestro Studio with a sample payload:
   ```json
   {
     "sponsor_id": "demo-sponsor",
     "sponsor_email": "sponsor@example.com",
     "repo_url": "near/near-sdk-rs",
     "requested_amount": 250,
     "requested_token": "USDC",
     "sponsor_context": "Critical dependency in our production pipeline."
   }
   ```
2. Watch each stage land in the case timeline.
3. Approve the finance task in Action Center.
4. Confirm the payout receipt and TEE attestation appear in the final stage.

---

## Demo wiring (5-min video)

For the recorded demo, set the controller into `AGENT_MODE=mock` so payouts
return stubbed transaction hashes and you don't burn real funds on camera.
The LangChain agent still uses the real LLM and the EigenAI insight is real —
those are the visible "AI doing real work" beats.

See `docs/DEMO_SCRIPT.md` for the minute-by-minute storyboard.

---

## Labs access

If you don't have a Labs invite yet:

1. Register on Devpost for UiPath AgentHack (the access form requires the
   Devpost registration ID).
2. Have your team rep submit the Labs access form. 3 business days quoted.
3. **In parallel**, sign up for UiPath Automation Cloud Community Edition.
   Action Center, Orchestrator, and Agent Builder previews are available there.
   Maestro availability outside Labs depends on tenant configuration — verify
   before relying on it as the fallback.

If Labs access hasn't landed by demo day, you can still demonstrate:
- The Agent Builder agents in the Agent Builder playground.
- The API workflows by calling them with `curl` and showing the responses.
- The Maestro case as a "would-deploy" walkthrough using the YAML.

This is the *least* desirable demo path — invest in getting Labs access early.

---

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| API workflow returns 401 | `controller_api_key` Asset doesn't match `AGENT_SERVER_API_KEY` on the controller |
| API workflow returns 400 with field paths | Zod validation in the controller; check the field paths in the error response against the schemas in `packages/controller-phala/src/http/v1/schemas.ts` |
| LangChain agent returns 502 | Controller unreachable from the agent; check `CONTROLLER_BASE_URL` env |
| Insight agent times out | LLM provider key missing or rate-limited; check `ANTHROPIC_API_KEY` and the agent logs |
| TEE attestation signature is all-zeros | Controller running outside a TEE (no `MNEMONIC` env var); expected outside EigenCompute / Phala dstack |
| `analyze_repo` returns no contributors | GitHub auth missing — set `GITHUB_TOKEN` or `GITHUB_APP_ID`/`GITHUB_PRIVATE_KEY` on the controller |
