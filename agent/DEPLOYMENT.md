# GitSplits Agent - Deployment

## Current Status (February 19, 2026)

### Production
- **EigenCompute deployment**: Live on Sepolia
- **App ID**: `0xe852Fa024C69F871D3D67D5463F5BA35E9d19e2B`
- **Latest app release time**: `2026-02-19 13:32:36` (sepolia)
- **TEE status**: Active
- **NEAR contract**: `lhkor_marty.near` migrated on mainnet
- **Contract migration tx**: `5VNpfg8yEiqqp7D3YoVaDuq2Z53nMMMwa5Zjez1mUy9R`
- **Endpoint auth**: `AGENT_SERVER_API_KEY` required on `/process`

### Staging
- **Hetzner Server**: `https://hetzner-agent.gitsplits.thisyearnofear.com`
- **Purpose**: Test deployments before EigenCompute upgrade
- **PM2 Managed**: Auto-restart on failure
- **Network hardening**: direct public `8443` blocked at firewall; ingress via `80/443` reverse proxy

### Web Frontend
- **Vercel**: `https://gitsplits.vercel.app`
- **Hybrid Agent Config**:
  - `AGENT_HETZNER_BASE_URL=https://hetzner-agent.gitsplits.thisyearnofear.com`
  - `AGENT_EIGEN_BASE_URL=https://agent.gitsplits.thisyearnofear.com`
  - `AGENT_API_KEY=<shared-secret>`
  - `AGENT_REQUIRE_EIGEN_FOR_CREATE_PAY=true`
  - `AGENT_ALLOW_HETZNER_EXEC_FALLBACK=false`

## Quick Start

```bash
cd agent
npm install
cp .env.example .env
# Edit .env with your API keys
npm run build
npm start
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `AGENT_MODE` | `mock` or `production` |
| `GITHUB_APP_ID` | GitHub App ID |
| `GITHUB_PRIVATE_KEY` | GitHub App private key |
| `NEAR_ACCOUNT_ID` | NEAR account |
| `NEAR_PRIVATE_KEY` | NEAR private key |
| `NEAR_CONTRACT_ID` | Contract account ID |
| `PING_PAY_API_KEY` | Ping Pay API key |
| `HOT_PAY_JWT` | HOT partner JWT |
| `EIGENAI_WALLET_PRIVATE_KEY` | deTERMinal grant wallet key |
| `EIGENAI_WALLET_ADDRESS` | deTERMinal grant wallet address |
| `AGENT_SERVER_API_KEY` | Required shared secret for `/process` endpoint |
| `NEYNAR_API_KEY` | Farcaster API (optional) |
| `NEYNAR_SIGNER_UUID` | Farcaster signer (optional) |

## Local Development

```bash
# Mock mode (no API keys)
AGENT_MODE=mock npm run dev:cli

# Production mode
AGENT_MODE=production npm run dev
```

## Docker

```bash
# Build
npm run docker:build

# Run
docker run -p 3000:3000 --env-file .env gitsplits-agent
```

## EigenCompute Deployment

### Deploy to Production

```bash
# 1. Authenticate
ecloud auth login

# 2. Build and deploy
cd agent/deploy
./deploy.sh
```

### Important Note

Use `app upgrade` for ongoing releases on the existing Sepolia app.  
Use `app deploy` only for first-time app creation.

### Upgrade Production (Verifiable)

```bash
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

### Monitor

```bash
# Status
ecloud compute app list --environment sepolia

# Logs
ecloud compute app logs 0xe852Fa024C69F871D3D67D5463F5BA35E9d19e2B --environment sepolia --watch

# Health check
curl https://agent.gitsplits.thisyearnofear.com/health
```

## Staging (Hetzner)

### Deploy to Staging

```bash
ssh snel-bot "cd /opt/gitsplits/repo/agent && git pull && npm run build && pm2 restart gitsplits-agent --update-env"
```

### Security Validation (Direct Endpoint)

```bash
# Without key -> should be 401
curl -i -X POST https://hetzner-agent.gitsplits.thisyearnofear.com/process \
  -H "content-type: application/json" \
  -d '{"text":"@gitsplits analyze thisyearnofear/gitsplits","author":"audit","type":"web"}'

# With key -> should be 200
curl -i -X POST https://hetzner-agent.gitsplits.thisyearnofear.com/process \
  -H "content-type: application/json" \
  -H "x-agent-api-key: $AGENT_SERVER_API_KEY" \
  -d '{"text":"@gitsplits analyze thisyearnofear/gitsplits","author":"audit","type":"web"}'
```

## NEAR Contract Deployment (Recommended Path)

### Why this path

- Local deploys can fail with older local `cargo-near` + wasm validator compatibility.
- Dockerized `cargo-near` on Hetzner is currently the most reliable production path.

### Deploy from Hetzner using Dockerized cargo-near

```bash
ssh snel-bot
cd /opt/gitsplits/repo
git pull --ff-only origin master

cd contracts/near
set -a
source ../../agent/.env
set +a

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

### Verify deployed contract

```bash
curl -s https://rpc.mainnet.near.org \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":"1","method":"query","params":{"request_type":"view_code","finality":"final","account_id":"lhkor_marty.near"}}'
```

## Health Checks

```bash
# Health
curl http://localhost:3000/health

# Ready (for load balancers)
curl http://localhost:3000/ready
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Agent won't start | Check `npm run build` output for missing env vars |
| Farcaster failed | Verify `NEYNAR_API_KEY` and `NEYNAR_SIGNER_UUID` |
| GitHub errors | Check GitHub App is installed on target repos |
| NEAR errors | Verify account has balance and contract deployed |

## Production Checklist

- [ ] All API keys are production keys
- [ ] NEAR account is mainnet
- [ ] GitHub App installed on target repos
- [ ] Environment variables secured (not in repo)
- [ ] Health checks configured
- [ ] Farcaster bot secured with 2FA
- [ ] Production preflight passed (`test:production:preflight`)
- [ ] Production intents passed (`test:production:intents`)
