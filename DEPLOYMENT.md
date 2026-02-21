# GitSplits Sovereign Monolith Deployment Guide

This guide covers the deployment of the consolidated **Sovereign Monolith** stack. The architecture is designed to run the GitSplits Agent inside a **Phala Network (dstack)** TEE to establish on-chain sovereignty and utilize **EigenAI** for verifiable intelligence.

---

## 🏗️ Architecture Overview

1.  **Frontend:** Next.js application (Port 3000).
2.  **Sovereign Agent:** Unified Brain + Muscle running on Phala dstack (Port 3002).
3.  **Inference:** Stateless API calls to EigenAI deTERMinal.
4.  **Chain Access:** NEAR Chain Signatures for cross-chain execution.

---

## 🚀 Local Deployment (Docker Compose)

The fastest way to test the production-ready stack locally:

```bash
# 1. Configure environment variables
cp .env.example .env

# 2. Build and start the services
docker-compose up --build
```

The stack will be available at:
- **Frontend:** [http://localhost:3000](http://localhost:3000)
- **Agent API:** [http://localhost:3002](http://localhost:3002)

---

## 🛠️ Infrastructure Deployment (Hetzner / Linux VPS)

To deploy the production monolith on a standard Linux server:

### 1. Prerequisites
- Docker & Docker Compose installed.
- Valid Domain/SSL (recommended via Caddy or Nginx).
- NEAR Account & Private Key for the Agent.

### 2. Manual Build Process
If you are building without Docker Compose:

```bash
# Install dependencies for the monorepo
npm install

# Build the shared logic
npm run build:shared

# Build the monolithic agent
npm run build:agent
```

### 3. Environment Variables
Ensure the following are set on your production server:

| Variable | Description |
| :--- | :--- |
| `NEAR_ACCOUNT_ID` | The Agent's NEAR account (e.g., `agent.near`). |
| `NEAR_PRIVATE_KEY` | The private key for the above account. |
| `EIGENAI_WALLET_ADDRESS` | The EVM wallet address used for EigenAI grants. |
| `EIGENAI_WALLET_PRIVATE_KEY` | The private key for the above EVM wallet. |
| `GITHUB_APP_ID` | GitHub App ID for repository indexing. |
| `GITHUB_PRIVATE_KEY` | GitHub App Private Key (base64 or \n formatted). |
| `AGENT_BASE_URL` | The public URL where your Agent is hosted. |

---

## 🛡️ TEE Deployment (Phala Network)

To achieve true sovereignty, the `gitsplits-agent` image should be deployed to a **Phala dstack** node.

### 1. Build the Production Image
```bash
npm run docker:build:agent
```

### 2. Push to Registry
```bash
docker tag yourusername/gitsplits-agent:latest your-registry/gitsplits-agent:latest
docker push your-registry/gitsplits-agent:latest
```

### 3. Deploy to dstack
When deploying via the Phala console, ensure:
- **Port Mapping:** 3002 (Internal) -> 443 (External/SSL).
- **Environment:** Pass all variables listed in the "Environment Variables" section.
- **Verification:** Once deployed, the `/health` endpoint will display `compute: Secure TEE (Phala dstack)`.

---

## 📈 Monitoring & Health

The Agent exposes several endpoints for health monitoring:
- `GET /health`: Detailed status of all sub-services (NEAR, EigenAI, GitHub).
- `GET /ready`: Simple 200/503 for orchestration/liveness probes.
- `POST /canary/run`: Trigger a self-test of the entire payment and analysis loop.

---

## 🔧 Maintenance

### Updating the Agent
Since it is a monolith, updates are atomic:
1. Pull latest code.
2. `docker-compose up --build -d agent`.
3. The Agent will restart and resume its social polling (Farcaster) immediately.

### Updating the Frontend
The frontend is decoupled and can be updated independently. It communicates with the Agent via the `CONTROLLER_URL` environment variable.
```markdown