# GitSplits Agent - Deployment Guide

This guide covers deploying the GitSplits agent to various environments.

## Quick Start

```bash
# 1. Install dependencies
cd agent
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env with your API keys

# 3. Run in mock mode (no API keys needed)
npm run dev

# 4. Or build and run in production mode
npm run build
npm start
```

## Environment Setup

### Required Variables

| Variable | Description | Get From |
|----------|-------------|----------|
| `AGENT_MODE` | `mock` or `production` | - |
| `GITHUB_TOKEN` | GitHub API access | https://github.com/settings/tokens |
| `NEAR_ACCOUNT_ID` | Your NEAR account | NEAR Wallet |
| `NEAR_PRIVATE_KEY` | NEAR private key | NEAR CLI or Wallet |

### Optional Variables

| Variable | Description | Get From |
|----------|-------------|----------|
| `NEYNAR_API_KEY` | Farcaster API access | https://neynar.com/ |
| `NEYNAR_SIGNER_UUID` | Farcaster signer | Neynar Dashboard |
| `FARCASTER_BOT_FID` | Your bot's FID | Warpcast Profile |
| `PING_PAY_API_KEY` | Cross-chain payments | https://pingpay.io/ |

## Local Development

### Mock Mode (No API Keys)

Perfect for testing the agent logic without real APIs:

```bash
AGENT_MODE=mock npm run dev:cli
```

This starts an interactive CLI where you can test commands:

```
@gitsplits> pay 100 USDC to near-sdk-rs
✅ Paid 100 USDC to 4 contributors!

Transaction: 0xabc123...
Split: split-xyz789
```

### Production Mode (With API Keys)

```bash
# Set your environment variables
export GITHUB_TOKEN=ghp_...
export NEAR_ACCOUNT_ID=gitsplits.near
export NEAR_PRIVATE_KEY=ed25519:...

# Run the server
npm run dev
```

The server will:
- Start on port 3000 (or PORT env var)
- Initialize Farcaster client (if configured)
- Listen for HTTP requests and mentions

## Docker Deployment

### Build Docker Image

```bash
cd agent
npm run docker:build
```

### Run Docker Container

```bash
docker run -p 3000:3000 --env-file .env gitsplits-agent
```

### Docker Compose

```yaml
version: '3.8'
services:
  gitsplits-agent:
    build:
      context: ./agent
      dockerfile: Dockerfile.eigen
    ports:
      - "3000:3000"
    environment:
      - AGENT_MODE=production
      - GITHUB_TOKEN=${GITHUB_TOKEN}
      - NEAR_ACCOUNT_ID=${NEAR_ACCOUNT_ID}
      - NEAR_PRIVATE_KEY=${NEAR_PRIVATE_KEY}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

## EigenCloud Deployment

### Prerequisites

1. EigenCloud account and API key
2. Docker installed locally
3. GitSplits agent built and tested locally

### Deploy Steps

1. **Build for EigenCloud:**
   ```bash
   cd agent
   npm run build
   docker build -t gitsplits-agent -f Dockerfile.eigen .
   ```

2. **Push to EigenCloud:**
   ```bash
   # Tag for EigenCloud registry
   docker tag gitsplits-agent registry.eigencloud.xyz/gitsplits-agent:latest
   
   # Push image
   docker push registry.eigencloud.xyz/gitsplits-agent:latest
   ```

3. **Deploy with TEE:**
   ```bash
   eigencloud deploy \
     --image gitsplits-agent:latest \
     --name gitsplits-agent \
     --tee \
     --env-file .env \
     --port 3000
   ```

4. **Verify Deployment:**
   ```bash
   # Get deployment URL
   eigencloud status gitsplits-agent
   
   # Check health
   curl https://gitsplits-agent.eigencloud.xyz/health
   ```

### EigenCloud Environment Variables

Set these in the EigenCloud dashboard or via CLI:

```bash
eigencloud env set GITHUB_TOKEN ghp_... --app gitsplits-agent
eigencloud env set NEAR_PRIVATE_KEY ed25519:... --app gitsplits-agent
eigencloud env set NEYNAR_API_KEY ... --app gitsplits-agent
```

## Farcaster Bot Setup

### 1. Create Farcaster Account

1. Download Warpcast app
2. Create a new account for your bot
3. Note the FID from your profile URL

### 2. Get Neynar API Access

1. Sign up at https://neynar.com/
2. Create an API key
3. Create a signer for your bot

### 3. Configure Environment

```bash
NEYNAR_API_KEY=your_api_key
NEYNAR_SIGNER_UUID=your_signer_uuid
FARCASTER_BOT_FID=12345
```

### 4. Test the Bot

```bash
# Post a test cast
curl -X POST http://localhost:3000/webhook/farcaster \
  -H "Content-Type: application/json" \
  -d '{
    "type": "cast.created",
    "cast": {
      "text": "@gitsplits pay 100 USDC to near-sdk-rs",
      "author": {"fid": 123, "username": "testuser"},
      "mentioned_profiles": [{"fid": 12345, "username": "gitsplits"}]
    }
  }'
```

## Health Monitoring

### Health Check Endpoint

```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2026-02-16T10:30:00Z",
  "uptime": 3600000,
  "version": "1.0.0",
  "services": {
    "farcaster": "connected",
    "github": "available",
    "near": "available"
  },
  "metrics": {
    "requests": 150,
    "errors": 2
  }
}
```

### Ready Check

For Kubernetes or load balancers:

```bash
curl http://localhost:3000/ready
```

Returns 200 when all services are available, 503 otherwise.

## Troubleshooting

### Agent Won't Start

```bash
# Check environment
npm run build
node dist/index.js

# Look for missing env vars
```

### Farcaster Connection Failed

- Verify NEYNAR_API_KEY is valid
- Check that signer UUID is correct
- Ensure bot FID matches the signer account

### GitHub API Errors

- Check GITHUB_TOKEN has `public_repo` scope
- Verify token hasn't expired
- Check rate limits: https://api.github.com/rate_limit

### NEAR Contract Errors

- Verify NEAR_ACCOUNT_ID has contract deployed
- Check NEAR_PRIVATE_KEY format (ed25519:...)
- Ensure account has sufficient balance

### Docker Build Fails

```bash
# Clean build
docker build --no-cache -t gitsplits-agent -f Dockerfile.eigen .

# Check Node version
docker run --rm node:18-slim node --version
```

## Production Checklist

- [ ] All API keys are production keys
- [ ] NEAR account is mainnet (not testnet)
- [ ] GitHub token has limited scopes
- [ ] Environment variables are secure (not in repo)
- [ ] Health checks are configured
- [ ] Logging is set up
- [ ] Monitoring alerts configured
- [ ] Farcaster bot account secured with 2FA
- [ ] Backup plan for private keys

## Support

- GitHub Issues: https://github.com/yourusername/gitsplits/issues
- Documentation: https://docs.gitsplits.xyz
- Discord: https://discord.gg/gitsplits
