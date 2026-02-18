# GitSplits

Autonomous AI agent that compensates open source contributors via natural language commands, running on EigenCompute for cryptographic transparency.

## Quick Demo

```
@gitsplits pay 100 USDC to github.com/near/near-sdk-rs
```

The agent analyzes the repository, calculates fair splits based on contribution history, and distributes funds to verified contributors.

## Features

- **Natural Language**: Just mention @gitsplits with a command
- **No Setup**: Contributors verify once, then auto-receive payments
- **Cross-Chain**: Contributors receive funds on their preferred chain
- **Cryptographic Transparency**: Attested execution via EigenCompute TEE
- **Web UI**: Interactive chat interface at https://gitsplits.vercel.app/agent

## How to Use

### For Contributors

1. **Verify (one-time):** `DM @gitsplits: verify your-github-username`
2. **Receive payments** automatically when someone pays your repo

### For Repository Owners

```
@gitsplits analyze my-org/my-repo     # Check contributions
@gitsplits create split for my-org/my-repo  # Set up split
@gitsplits pay 100 USDC to my-org/my-repo   # Pay contributors
@gitsplits pending my-org/my-repo     # Check pending claims
```

See [**docs/GUIDE.md**](docs/GUIDE.md) for full command reference.

## Web Interface

- **Agent Chat**: https://gitsplits.vercel.app/agent
- **Verify Identity**: https://gitsplits.vercel.app/verify
- **View Splits**: https://gitsplits.vercel.app/splits
- **Dashboard**: https://gitsplits.vercel.app/dashboard

## Architecture

```
Farcaster/Web → Intent Agent → EigenCompute (TEE) → NEAR + Payments
                                    ↓
                          Attestation of Execution
```

| Layer | Technology |
|-------|-----------|
| Social | Farcaster (@gitsplits bot) |
| Agent | Custom intent-based framework |
| Compute | EigenCompute (TEE + AVS) |
| Blockchain | NEAR Protocol |
| Payments | Ping Pay, HOT Pay |

See [**docs/ARCHITECTURE.md**](docs/ARCHITECTURE.md) for system design.

## Documentation

| Doc | Description |
|-----|-------------|
| [**GUIDE.md**](docs/GUIDE.md) | Commands and usage reference |
| [**SETUP.md**](docs/SETUP.md) | Developer setup, deployment, contract details |
| [**ARCHITECTURE.md**](docs/ARCHITECTURE.md) | System design and components |
| [**PLATFORM.md**](docs/PLATFORM.md) | Roadmap and future vision |

## Quick Start

```bash
git clone https://github.com/thisyearnofear/gitsplits
cd gitsplits/agent
npm install
cp .env.example .env
# Edit .env with your API keys
AGENT_MODE=mock npm run dev
```

See [**docs/SETUP.md**](docs/SETUP.md) for full setup instructions.

## Current Status

- ✅ EigenCompute agent live on Sepolia
- ✅ Production endpoint: https://agent.gitsplits.thisyearnofear.com
- ✅ NEAR contract `lhkor_marty.near` on mainnet
- ✅ Web UI: https://gitsplits.vercel.app
- ✅ Production tests: 11/11 preflight, 3/3 intents passed

## License

MIT
