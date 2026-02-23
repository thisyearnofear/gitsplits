# Phala Cutover Runbook

This runbook defines a safe migration from the current Hetzner controller runtime to Phala dstack.

## Current State

- Web production points to Hetzner controller.
- Hetzner canary passes (`github`, `near`, `eigenai`, and at least one payment rail).
- Runtime is healthy but non-attested (`teeWallet: mock`).

## Target State

- Primary runtime on Phala dstack with attested execution.
- Health reflects attested runtime (`teeWallet: tee`).
- Hetzner retained as fallback plane until error budget is met.

## Preconditions

1. Phala deployment with identical controller image/tag as Hetzner.
2. Environment parity:
   - `AGENT_MODE=production`
   - GitHub App, NEAR, HOT Pay, Ping Pay, EigenAI credentials
   - `AGENT_SERVER_API_KEY`
3. TLS + domain routing for Phala endpoint.
4. `/health`, `/ready`, `/canary/run` reachable from control plane.

## Acceptance Gates

1. **Readiness Gate**
   - `/ready` returns `200`
   - `readiness.ready=true`
2. **Dependency Gate**
   - `/canary/run` returns `ok=true`
3. **Live Intent Gate**
   - `analyze` returns contributor section + Eigen proof link
   - `create` returns created/already-exists without mock markers
   - `pay` completes with transaction evidence
4. **Attestation Gate**
   - `/health` reports `teeWallet=tee`
   - Runtime string confirms attested compute

## Rollout Plan

1. **0% Shadow**
   - Keep traffic on Hetzner.
   - Run Phala canary every 5 minutes for 2 hours.
2. **10% Canary**
   - Route 10% low-risk intents (`analyze`) to Phala.
   - Keep `pay` pinned to Hetzner.
3. **50% Mixed**
   - Route `analyze` + `create` to Phala.
   - Route `pay` to Phala only after 24h zero critical errors.
4. **100% Primary**
   - Route all intents to Phala.
   - Keep Hetzner fallback enabled for 7 days.

## Rollback Conditions

Rollback immediately to Hetzner if any occur:

1. `/ready` non-200 for > 2 minutes
2. canary `ok=false` on two consecutive runs
3. payment failures exceed 2% over 30 minutes
4. missing attestation signals in production

## Post-Cutover Checks

1. Confirm web `/api/agent` upstream and keys match active plane.
2. Confirm webhook endpoints still validate signatures.
3. Confirm payment receipt UX still shows tx references.
4. Archive canary and incident logs for audit trail.
