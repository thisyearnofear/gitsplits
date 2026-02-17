# GitSplits Agent — EigenCompute Deployment

## Prerequisites

- Docker: https://docs.docker.com/get-docker/
- ecloud CLI: `npm install -g @layr-labs/ecloud-cli`
- Active billing subscription: `ecloud billing subscribe`

## Deployment Process

1. **Authenticate** — `ecloud auth login`
2. **Deploy** — `./deploy.sh` (or `./deploy.sh --testnet` for Sepolia)

The `ecloud compute app deploy` command builds the Docker image from the
project Dockerfile, pushes it, and deploys it to EigenCompute in one step.

## Required Environment Variables

Set these via `ecloud compute env set-var` or through the EigenCompute dashboard:

| Variable | Description |
|---|---|
| `EIGENAI_WALLET_PRIVATE_KEY` | Wallet private key for on-chain operations |
| `EIGENAI_WALLET_ADDRESS` | Wallet address |
| `GITHUB_TOKEN` | GitHub API token for repo analysis |
| `NEAR_ACCOUNT_ID` | NEAR account for split payments |
| `NEAR_PRIVATE_KEY` | NEAR account private key |
| `NEAR_CONTRACT_ID` | Deployed NEAR splits contract |
| `NEYNAR_API_KEY` | Neynar API key for Farcaster |
| `NEYNAR_SIGNER_UUID` | Neynar signer UUID |
| `FARCASTER_BOT_FID` | Farcaster bot FID |

> **Note:** `MNEMONIC` is auto-injected by EigenCompute KMS — do not set it manually.

## Checking App Status and Logs

```bash
ecloud compute app info    # App status, health, uptime
ecloud compute app logs    # Stream application logs
```

## Billing

An active EigenCompute subscription is required before deploying:

```bash
ecloud billing subscribe
```
