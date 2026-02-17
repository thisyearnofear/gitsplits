# EigenCompute Deployment

## Prerequisites

- Docker: https://docs.docker.com/get-docker/
- ecloud CLI: `npm install -g @layr-labs/ecloud-cli`
- Active billing: `ecloud billing subscribe`

## Current Deployment Status (February 17, 2026)

- Environment: `sepolia`
- App URL: `https://agent.gitsplits.thisyearnofear.com`
- Readiness: `GET /ready` returns `200` with `ready: true`
- Health: `GET /health` returns `200`

## Deploy

```bash
# 1. Authenticate
ecloud auth login

# 2. Deploy
./deploy.sh
# or for testnet: ./deploy.sh --testnet
```

## Environment Variables

Set via `ecloud compute env set-var` or dashboard:

| Variable | Description |
|----------|-------------|
| `EIGENAI_WALLET_PRIVATE_KEY` | Wallet private key |
| `EIGENAI_WALLET_ADDRESS` | Wallet address |
| `GITHUB_APP_ID` | GitHub App ID (recommended) |
| `GITHUB_PRIVATE_KEY` | GitHub App private key PEM |
| `GITHUB_TOKEN` | GitHub PAT (fallback, optional) |
| `NEAR_ACCOUNT_ID` | NEAR account |
| `NEAR_PRIVATE_KEY` | NEAR private key |
| `NEAR_CONTRACT_ID` | NEAR contract |
| `NEYNAR_API_KEY` | Neynar API key |
| `NEYNAR_SIGNER_UUID` | Neynar signer UUID |
| `FARCASTER_BOT_FID` | Farcaster bot FID |

> **Note:** `MNEMONIC` is auto-injected by EigenCompute KMS.
>
> **TLS note:** If `DOMAIN` is set, deployment also needs a Caddyfile in the build.
> In this repo, pass `--build-caddyfile agent/Caddyfile` for verifiable builds.

## Monitoring

```bash
# App status
ecloud compute app info

# Logs
ecloud compute app logs
```
