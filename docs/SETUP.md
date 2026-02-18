# GitSplits Setup Guide

Developer setup, environment configuration, and deployment instructions.

## Quick Start

```bash
git clone https://github.com/thisyearnofear/gitsplits
cd gitsplits/agent
npm install
cp .env.example .env
# Edit .env with your API keys
AGENT_MODE=mock npm run dev
```

---

## Environment Variables

### Agent (`agent/.env`)

```bash
# Mode
AGENT_MODE=production          # 'mock' for local, 'production' for live

# GitHub App (https://github.com/settings/apps/new)
GITHUB_APP_ID=123456
GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----..."
GITHUB_TOKEN=...               # Optional fallback for public repos

# NEAR
NEAR_ACCOUNT_ID=your-account.near
NEAR_PRIVATE_KEY=ed25519:...
NEAR_CONTRACT_ID=lhkor_marty.near

# Payments
PING_PAY_API_KEY=...
HOT_PAY_JWT=...

# EigenCompute
EIGENAI_WALLET_PRIVATE_KEY=0x...
EIGENAI_WALLET_ADDRESS=0x...

# Optional
AGENT_SERVER_API_KEY=...       # Process endpoint protection
NEYNAR_API_KEY=...             # Farcaster bot
NEYNAR_SIGNER_UUID=...         # Farcaster signer
FARCASTER_BOT_FID=...          # Bot FID
```

### Web (`.env.local`)

```bash
AGENT_BASE_URL=https://agent.gitsplits.thisyearnofear.com
NEXT_PUBLIC_PROJECT_ID=...     # From https://cloud.reown.com
NEXT_PUBLIC_CONTRACT_ID=lhkor_marty.near
```

---

## GitHub App Setup

1. Go to https://github.com/settings/apps/new
2. Configure:
   - **Name**: `gitsplits`
   - **Homepage**: `https://gitsplits.vercel.app`
   - **Callback URL**: `https://gitsplits.vercel.app/api/github/callback`
   - **Webhook**: Disabled
3. **Permissions:**
   - Repository contents: Read-only
   - Repository metadata: Read-only
   - Pull requests: Read-only
   - Gists: Read-only
4. Generate private key and add to `.env`

---

## NEAR Contract Deployment

**Important:** Use Dockerized `cargo-near` on Hetzner to avoid wasm validation issues.

```bash
ssh snel-bot
cd /opt/gitsplits/repo/contracts/near
set -a && source ../../agent/.env && set +a

docker run --rm --user 0:0 \
  -v "$PWD":/workspace \
  -w /workspace \
  -e NEAR_CONTRACT_ID \
  -e NEAR_PRIVATE_KEY \
  sourcescan/cargo-near:0.19.0-rust-1.86.0 \
  cargo near deploy build-non-reproducible-wasm "$NEAR_CONTRACT_ID" \
  with-init-call migrate json-args "{}" \
  prepaid-gas "300 Tgas" attached-deposit "0 NEAR" \
  network-config mainnet \
  sign-with-plaintext-private-key "$NEAR_PRIVATE_KEY" \
  send
```

### Verify Deployment

```bash
curl -s https://rpc.mainnet.near.org \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":"1","method":"query","params":{"request_type":"view_code","finality":"final","account_id":"lhkor_marty.near"}}'
```

---

## Agent Deployment

### EigenCompute (Production)

```bash
cd agent/deploy
./deploy.sh

# Upgrade existing app
ecloud compute app upgrade 0xe852Fa024C69F871D3D67D5463F5BA35E9d19e2B \
  --environment sepolia \
  --verifiable \
  --repo https://github.com/thisyearnofear/gitsplits \
  --commit <FULL_40_CHAR_SHA> \
  --build-context agent \
  --build-dockerfile Dockerfile.eigen \
  --build-caddyfile Caddyfile \
  --env-file /opt/gitsplits/repo/agent/.env \
  --instance-type g1-standard-4t \
  --log-visibility private \
  --resource-usage-monitoring enable
```

### Hetzner (Staging/Fallback)

```bash
ssh snel-bot "cd /opt/gitsplits/repo/agent && git pull && npm run build && pm2 restart gitsplits-agent --update-env"
```

---

## Web UI Deployment

```bash
cd gitsplits
npm install

# Create .env.local
cat > .env.local << EOF
AGENT_BASE_URL=https://agent.gitsplits.thisyearnofear.com
NEXT_PUBLIC_PROJECT_ID=<from https://cloud.reown.com>
EOF

npm run dev
```

Deploy to Vercel with environment variables set.

---

## Testing

```bash
# Unit tests
cd agent && npm test

# Production preflight
AGENT_MODE=production npm run test:production:preflight

# Production intents
AGENT_MODE=production npm run test:production:intents -- --runInBand
```

---

## Health Checks

```bash
# Readiness (production dependencies valid)
curl -s https://agent.gitsplits.thisyearnofear.com/ready

# Health (service status)
curl -s https://agent.gitsplits.thisyearnofear.com/health
```

---

## Sponsor Integration Status

| Sponsor | Purpose | Status |
|---------|---------|--------|
| **Ping Pay** | Cross-chain payments | ✅ Integrated |
| **EigenCloud** | TEE compute | ✅ Deployed |
| **HOT Pay** | Fiat onramp | 🔲 Planned |
| **NOVA** | Private data | 🔲 Planned |

---

## Production Checklist

- [ ] All API keys are production keys
- [ ] NEAR account is mainnet with sufficient balance
- [ ] GitHub App installed on target repos
- [ ] Environment variables secured (not in repo)
- [ ] Health checks configured
- [ ] Production preflight passed
- [ ] Production intents passed

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Agent won't start | Run `npm run build`, check env vars |
| Farcaster failed | Verify Neynar keys and signer UUID |
| GitHub errors | Check App install on target repos |
| NEAR errors | Verify account balance and contract ID |
| Contract deploy fails | Use Dockerized cargo-near on Hetzner |

---

## Current Production Status

- **Agent:** https://agent.gitsplits.thisyearnofear.com (EigenCompute Sepolia)
- **Web:** https://gitsplits.vercel.app
- **Contract:** `lhkor_marty.near` (mainnet)
- **Fallback:** Hetzner server available for recovery
