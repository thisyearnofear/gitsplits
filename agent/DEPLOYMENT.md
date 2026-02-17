# GitSplits Agent - Deployment

## Current Status (February 17, 2026)

- EigenCompute deployment is live on Sepolia infra (release commit: `54683ccfc76593b25ab557247b58374d82950746`).
- Public HTTPS URL: `https://agent.gitsplits.thisyearnofear.com`
- `GET /ready` and `GET /health` are both passing.
- Live intent checks:
  - `analyze` passes (GitHub + EigenAI signature path working).
  - `create` passes (existing split path + repair path).
  - `verify` passes (web-linked GitHub -> NEAR wallet mapping).
  - `pay` and `pending` pass with verification gating + pending claims.

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

```bash
cd agent/deploy
./deploy.sh
```

See [EIGENCOMPUTE.md](./deploy/EIGENCOMPUTE.md) for details.

### Verifiable Upgrade (non-interactive)

```bash
ecloud compute app upgrade <APP_ID> \
  --environment sepolia \
  --verifiable \
  --repo https://github.com/thisyearnofear/gitsplits \
  --commit <FULL_40_CHAR_SHA> \
  --build-context agent \
  --build-dockerfile Dockerfile.eigen \
  --build-caddyfile agent/Caddyfile \
  --env-file /opt/gitsplits/repo/agent/.env \
  --instance-type g1-standard-4t \
  --log-visibility private \
  --resource-usage-monitoring enable
```

For web clients, set:

```bash
AGENT_BASE_URL=https://agent.gitsplits.thisyearnofear.com
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
