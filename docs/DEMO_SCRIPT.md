# Demo Video Script — 5 minutes max

> **Pre-recorded silent reference clips** live in `docs/demo/`:
>
> - **`browser-walkthrough.mp4`** (2 min 32 s, 2.0 MB, 1440×900) — Playwright recording
>   of the full enterprise flow: landing → sponsor portal → live case timeline → dashboard
>   → orchestration. No audio. Use as the silent B-roll backbone you record voice-over on
>   top of in OBS / ScreenFlow / Loom.
> - **`cli.cast`** (asciinema, 35 s) — controller `/api/case` round-trip, autonomy-tier
>   routing across three amounts ($250 / $7,500 / $50,000 → T0 / T2 / T3), and the
>   LangChain insight-agent CLI help. Play with `asciinema play docs/demo/cli.cast`
>   or embed with `agg docs/demo/cli.cast docs/demo/cli.gif` for a gif.
> - **`cli-script.sh`** — the source script for the cast, so the recording is reproducible
>   against a fresh dev server (`PORT=43016 npm run dev` then `bash docs/demo/cli-script.sh`).


Target length: **4:45**. Buffer for upload pipeline variance.

Recording setup:
- 1920×1080, 30fps, screen share + webcam in a small corner
- Browser zoomed to ~110% so judges can read at 720p playback
- Two desktops set up: **UiPath Automation Cloud** (Maestro Studio + Action Center) on one, **VS Code with Claude Code + your terminal** on the other
- A pre-loaded sample sponsor email visible on a third screen / sticky note

Recording goal: **one continuous take** if possible. Pre-record any cold paths
(LangChain warmup, NEAR transaction landing) and have them ready to swap to.

---

## 0:00 – 0:30 · Hook

> "Every Fortune 500 enterprise depends on open-source software they don't
> fund. The blockers aren't philosophical — they're Finance, Compliance, and
> audit. GitSplits is a UiPath Maestro Case that turns a sponsor's
> funding request into a fully orchestrated, audited transaction."

**On screen:** quick cut between three images:
1. A Slack message: "we should really pay the maintainers of [popular library]"
2. A spreadsheet labeled `oss-payments-2024.xlsx`
3. The GitSplits `/orchestration` page hero

**Off screen:** name the track (Maestro Case) so judges know which bucket.

---

## 0:30 – 1:00 · The case in one slide

**On screen:** `/orchestration` page from `localhost:3000/orchestration`.
Scroll smoothly down past the seven stages.

> "Seven stages: intake, repo analysis, verification, compliance and approval,
> split creation, payout, reconciliation. Five exception lanes for the
> failure modes that actually happen — payouts failing, sanctions hits,
> disputes. Each stage calls the right actor: a UiPath Agent Builder agent,
> a LangChain external agent, or our backend that owns the tool calls."

---

## 1:00 – 1:45 · Trigger the case

**On screen:** UiPath Maestro Studio → "OSS Funding Request" case →
Create instance. Paste:

```json
{
  "sponsor_id": "acme-fintech",
  "sponsor_email": "maya@acme.example",
  "repo_url": "near/near-sdk-rs",
  "requested_amount": 2500,
  "requested_token": "USDC",
  "sponsor_context": "We depend on near-sdk-rs in our payments rail."
}
```

> "I'm Maya, an OSPO director at a fintech. I want to fund the maintainers of
> near-sdk-rs, a library we depend on in production. I drop this into the
> intake — could just as easily be an email or a webhook."

Click **Create**. The case shows the first stage starting.

**Cut to:** Case timeline visible. Stage 1 (Intake Triage Agent) ticks green
after a moment.

---

## 1:45 – 2:30 · The AI doing real work

**On screen:** Case stage "Repo Analysis" expanding to show two parallel
tasks: `contributor_breakdown` (our controller) and `ai_insight` (LangChain).

Switch to terminal with the LangChain server logs streaming.

> "Repo Analysis calls our LangChain agent. It pulls the contributor breakdown
> from GitHub, then asks EigenAI — an attested AI service — to grade each
> contributor's quality. Then a critic step looks for bot inflation and
> concentration risk. Then a recommend step produces the structured
> allocation."

Show the agent's response (use a pre-recorded swap if latency is too long):

```json
{
  "recommended_allocation": [...],
  "risk_flags": [
    {"code": "concentration", "severity": "warning", "message": "..."}
  ],
  "sponsor_summary": "...",
  "confidence": 0.82,
  "attestation": {
    "signature": "0x...",
    "explorerUrl": "https://determinal.eigenarcade.com/verify/0x..."
  }
}
```

> "Every recommendation comes with an EigenAI attestation. The signature
> links back to the exact model and inputs — auditable AI judgment, not a
> black box."

---

## 2:30 – 3:15 · Humans in charge

**On screen:** Compliance & Approval stage. Show the case flagged for finance
review because amount > $500.

Switch to UiPath **Action Center**. Maya's finance reviewer (you, in a
second account) sees the task with the AI summary, risk flags, and a
one-click approval.

> "$2,500 triggers finance review. The Approval Routing Agent — another
> UiPath-native agent — picked the right reviewer based on amount and risk
> flags. No static matrix to maintain. The reviewer sees the AI summary,
> the risk flags, the attestation, and approves."

Approve. The case resumes.

---

## 3:15 – 4:00 · Split, pay, attest

**On screen:** Case timeline scrolling through Split Creation → Payout
Execution → Reconciliation.

> "Split Creation writes the approved allocation to our NEAR splits
> contract. Payout Execution distributes via Ping Pay — NEAR Intents with
> chain signatures — to every verified contributor. Failed payouts route
> to the payout_failed exception lane for human recovery; not shown today
> but it's wired."

Cut to a terminal showing the on-chain transaction confirming.

Cut to the Reconciliation stage closing with the TEE attestation payload:

```json
{
  "attestation": {
    "payload": "...",
    "signature": "0x...",
    "signer": "0xTEE...",
    "isTee": true
  }
}
```

> "Reconciliation produces a TEE-signed attestation that binds the on-chain
> receipt to the case. This is what Maya hands to her CFO."

---

## 4:00 – 4:30 · Coding agents bonus

**On screen:** Split-screen VS Code with Claude Code on the left, the
generated file on the right (pre-record this segment; don't do live
coding on stage).

Pick one artifact — recommend the OpenAPI spec or the LangChain chain — and
show Claude Code generating it from a one-line prompt.

> "Every Maestro definition, every API workflow stub, the LangChain agent,
> the typed REST adapter — all scaffolded by Claude Code as a coding agent.
> The UiPath for Coding Agents pattern wasn't a deployment afterthought; it
> was the development environment."

Cut back to the case timeline showing everything green.

---

## 4:30 – 4:45 · Close

**On screen:** The `/orchestration` page hero again.

> "Maestro Case for the orchestration. Agent Builder for native agents.
> LangChain for external reasoning. Action Center for the humans. TEE
> attestation for the audit. This is enterprise OSS funding, orchestrated
> on UiPath."

End on the URL and the GitHub link.

---

## Pre-flight checklist

- [ ] Case published to your Maestro tenant
- [ ] Both Agent Builder agents tested in the playground
- [ ] API Workflows imported from OpenAPI and renamed per `api-workflows.yaml`
- [ ] LangChain agent running and reachable from Maestro (`/health` returns 200)
- [ ] Controller running in `AGENT_MODE=mock` so payouts are stubbed
- [ ] Sample sponsor payload ready to paste
- [ ] Two Action Center accounts set up (sponsor + reviewer)
- [ ] Pre-recorded Claude Code segment ready as a swap-in
- [ ] Pre-recorded happy-path payout transaction ready if mock mode is too sterile
- [ ] OBS / ScreenFlow project saved with both desktops captured
- [ ] Run-through completed in under 4:45 with one full take

## Things to NOT show

- Farcaster bot (off-topic for this audience)
- The legacy `/agent` chat (it works, but distracts from the case story)
- Any environment variables or secrets
- Long unedited LangChain warmup (>10s of dead air)
