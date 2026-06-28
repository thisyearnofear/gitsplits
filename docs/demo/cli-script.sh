#!/usr/bin/env bash
# CLI walkthrough recorded as docs/demo/cli.cast.
# Plays back via: asciinema play docs/demo/cli.cast
set -e

BASE="${BASE:-http://localhost:43016}"
sleep 0.5
say() {
  printf '\033[1;36m# %s\033[0m\n' "$1"
  sleep 0.9
}
run() {
  printf '\033[1;32m$\033[0m %s\n' "$1"
  sleep 0.6
  bash -c "$1"
  echo
  sleep 1.2
}

clear
say "GitSplits — controller + case engine, end to end on the CLI"
sleep 0.6

say "1. Submit a sponsor request (T1 — finance approval only)"
run "curl -sS -X POST $BASE/api/case -H 'Content-Type: application/json' -d '{\"repoUrl\":\"near/near-sdk-rs\",\"amount\":2500,\"token\":\"USDC\",\"sponsorEmail\":\"maya@example.com\",\"sponsorContext\":\"Critical dependency\"}' | python3 -m json.tool"

ID=$(curl -sS -X POST $BASE/api/case -H 'Content-Type: application/json' \
  -d '{"repoUrl":"near/near-sdk-rs","amount":2500,"token":"USDC","sponsorEmail":"maya@example.com","sponsorContext":"Critical dependency"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")

say "2. Poll the case as the engine runs the 8 Maestro stages"
for i in 1 2 3; do
  printf '\033[1;32m$\033[0m %s\n' "curl -sS $BASE/api/case/$ID | jq '.status, .autonomyTier, [.stages[] | {key, status}]'"
  sleep 0.4
  curl -sS "$BASE/api/case/$ID" | python3 -c "
import sys,json
d = json.load(sys.stdin)
print('  status         :', d.get('status'))
print('  autonomyTier   :', d.get('autonomyTier'))
print('  stages         :')
for s in d['stages']:
    icon = {'pending':'○','running':'▶','complete':'✓','blocked':'✗'}.get(s['status'],'·')
    print(f'    {icon} {s[\"key\"]:<24} {s[\"status\"]}')
"
  echo
  sleep 5
done

say "3. Tier auto-routing — show how thresholds drive the autonomy decision"
for amt in 250 7500 50000; do
  RES=$(curl -sS -X POST $BASE/api/case -H 'Content-Type: application/json' \
    -d "{\"repoUrl\":\"facebook/react\",\"amount\":$amt,\"token\":\"USDC\",\"sponsorEmail\":\"maya@example.com\",\"sponsorContext\":\"tier demo\"}" \
    | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
  sleep 3
  printf '\033[1;32m$\033[0m  amount=$%d → ' "$amt"
  curl -sS "$BASE/api/case/$RES" | python3 -c "
import sys,json
d = json.load(sys.stdin)
print(f'tier {d.get(\"autonomyTier\")} — {d.get(\"autonomyReasoning\",\"(pending)\")[:90]}')
"
done

echo
say "4. LangChain Repo Insight Agent — multi-step reasoning CLI"
run "../packages/insight-agent/.venv/bin/python ../packages/insight-agent/scripts/recommend.py --help"

echo
say "Same pattern in production: Maestro Case → API Workflows → controller /v1 → LangChain agent → NEAR + TEE attestation."
sleep 2
