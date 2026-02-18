# GitSplits Team Setup

This document is for the GitSplits team to set up and deploy the agent.

## Architecture

- **Single GitHub App**: We run one GitHub App that can analyze any public repository
- **Single Farcaster Account**: @gitsplits bot that users interact with
- **Single NEAR Contract**: All splits stored on one contract
- **EigenCloud TEE**: Agent runs in verifiable environment

## Required API Keys

### 1. GitHub App

Create at: https://github.com/settings/apps/new

**Settings:**
- Name: `gitsplits`
- Homepage: `https://gitsplits.vercel.app`
- Callback: `https://gitsplits.vercel.app/api/github/callback`
- Webhook: Disabled
- Permissions:
  - Repository contents: Read-only
  - Repository metadata: Read-only
  - Gists: Read-only

**Installation:**
- Can be installed on any account (for public repos)
- No installation needed for public repo analysis

### 2. Farcaster

Generate wallet and register FID:

```bash
cd agent
npx ts-node scripts/generate-wallet.ts
# Fund with $1 ETH on Optimism
npx ts-node scripts/register-farcaster.ts
```

### 3. NEAR

```bash
cd contracts/near
./deploy-mainnet.sh
```

### 4. Ping Pay

Sign up at https://pingpay.io, get API key.

### 5. EigenCloud

Sign up at https://eigencloud.xyz, get API key.

## Environment

Create `agent/.env`:

```bash
FARCASTER_PRIVATE_KEY=0x...
FARCASTER_FID=12345

GITHUB_APP_ID=123456
GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
..."

NEAR_ACCOUNT_ID=gitsplits.near
NEAR_PRIVATE_KEY=ed25519:...
NEAR_CONTRACT_ID=gitsplits.near

PING_PAY_API_KEY=...

EIGENCLOUD_API_KEY=...
```

## Deploy

```bash
cd agent
npm run build
docker build -t gitsplits-agent -f Dockerfile.eigen .

cd deploy
./deploy.sh
```

## Monitor

```bash
# Check logs
eigencloud logs --name gitsplits-agent

# Check status
eigencloud status --name gitsplits-agent
```

## Testing

1. Post on Farcaster: `@gitsplits analyze near/near-sdk-rs`
2. Check that agent responds with real GitHub data
3. If errors, check logs and fix
