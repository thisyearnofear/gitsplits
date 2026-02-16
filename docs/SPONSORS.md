# Sponsor Integration Guide

GitSplits integrates with four NEARCON 2026 Innovation Sandbox sponsors.

## Implementation Status

| Sponsor | Integration | Status | API Keys |
|---------|-------------|--------|----------|
| **Ping Pay** | Cross-chain payments | ✅ Code ready | 🔲 Get API key |
| **EigenCloud** | Verifiable compute | ✅ Config ready | 🔲 Get API key |
| **NOVA** | Private data | 🔲 Future | - |
| **HOT Pay** | Fiat onramp | 🔲 Future | - |

---

## Ping Pay

**What they do:** Cross-chain payment orchestration using NEAR Intents.

**Our integration:** Primary payment execution layer.

### Implementation (`/agent/src/tools/pingpay.ts`)

```typescript
// Create payment intent
const intent = await pingpay.distribute({
  splitId: 'split-abc123',
  amount: 100,
  token: 'USDC',
  recipients: [
    { wallet: 'alice.near', percentage: 40 },
    { wallet: 'bob.eth', percentage: 30 },
    { wallet: 'charlie.base', percentage: 20 },
    { wallet: 'dave.sol', percentage: 10 },
  ],
});

// Returns:
// {
//   txHash: '0x...',
//   intentId: 'intent-xyz',
//   status: 'completed',
//   recipients: 4,
//   totalAmount: 100,
//   token: 'USDC'
// }
```

### Features Used
- NEAR Intents for intent-based execution
- Cross-chain settlement
- Multi-recipient distributions
- Real-time status updates

### Error Handling
If Ping Pay API fails, the agent returns an error message immediately.

---

## EigenCloud

**What they do:** Verifiable cloud compute with TEEs and AVS backing.

**Our integration:** Agent execution environment.

### Configuration (`/agent/deploy/eigencloud.yaml`)

```yaml
compute:
  type: tee
  attest: true
  resources:
    cpu: 2
    memory: 4Gi
    storage: 10Gi

avs:
  enabled: true
  slashingConditions:
    - name: invalid_execution
      penalty: 1000
    - name: missed_response
      penalty: 100
```

### Deployment (`/agent/Dockerfile.eigen`)

```dockerfile
FROM node:18-slim

# Install TEE attestation helper
COPY --from=eigencloud/compute-base:latest /usr/local/bin/eigen-attest /usr/local/bin/

# Run with attestation
ENTRYPOINT ["eigen-attest", "node", "dist/index.js"]
```

### Deployment Script (`/agent/deploy/deploy.sh`)

```bash
./deploy.sh
# Builds, pushes to registry, deploys to EigenCompute with TEE
```

### Benefits
- Cryptographic proof of execution
- AVS slashing for misbehavior
- Deterministic, reproducible runs
- Hardware-backed isolation

---

## NOVA

**What they do:** Privacy-first, decentralized file sharing with encrypted persistence.

**Planned integration:** Private split configurations.

### Future Use Cases

**1. Private Split Configurations**
```typescript
const encryptedConfig = await nova.encrypt({
  splitId: "split-abc123",
  allocations: [
    { github: "alice", percentage: 50, wallet: "0x..." },
  ]
}, {
  accessControl: [ownerPublicKey, agentPublicKey]
});

const cid = await nova.store(encryptedConfig);
```

**2. Private Repository Analysis**
```typescript
const analysisResult = await eigenCompute.run(async () => {
  const repoData = await nova.access(privateRepoCid);
  return await analyzeContributions(repoData);
});
```

---

## HOT Pay

**What they do:** Non-custodial crypto payment gateway with fiat onramp.

**Planned integration:** Sponsor onboarding for non-crypto users.

### Future Use Cases

**Web2 Sponsor Onboarding**
```typescript
const paymentLink = await hotPay.createLink({
  amount: "1000",
  currency: "USD",
  settleTo: "USDC",
  metadata: {
    repo: "github.com/near/near-sdk-rs",
    sponsor: "company@example.com"
  }
});

// Send link to sponsor
// They pay with card, receive USDC in split contract
```

---

## Integration Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      FARCASTER USER                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    INTENT AGENT                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Intent Parser (pay, create, analyze, verify)         │  │
│  │  Tool Registry (GitHub, NEAR, Ping Pay)               │  │
│  │  Context Manager (User state)                         │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    EIGENCLOUD EIGENCOMPUTE                   │
│  - TEE container with attestation                            │
│  - Chain signatures for cross-chain                          │
│  - AVS backing for slashing                                  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    SPONSOR APIS                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Ping Pay   │  │  EigenCloud │  │    NOVA     │         │
│  │ (Payments)  │  │  (TEE/AVS)  │  │  (Privacy)  │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

---

## Environment Setup

```bash
# Ping Pay
PING_PAY_API_KEY=pp_...
PING_PAY_WEBHOOK_SECRET=...

# EigenCloud
EIGENCLOUD_API_KEY=ec_...
EIGENCLOUD_PROJECT=gitsplits

# NOVA (future)
NOVA_API_KEY=nv_...

# HOT Pay (future)
HOT_PAY_API_KEY=hp_...
```

---

## Demo Flow for NEARCON

### Current Implementation (Mock Mode)

```bash
cd agent
npm start

> analyze near-sdk-rs
📊 Analysis for github.com/near-sdk-rs
Total commits: 350
Contributors: 4
...

> pay 100 USDC to near-sdk-rs
✅ Paid 100 USDC to 4 contributors!
Transaction: 0x...
```

### Production (With API Keys)

1. **Create Split** (EigenCompute TEE)
   ```
   @gitsplits create github.com/near/near-sdk-rs
   ```
   → Shows TEE attestation hash

2. **Verify Identity** (NOVA + EigenCompute)
   ```
   DM @gitsplits verify ilblackdragon
   ```
   → Private verification flow

3. **Pay Contributors** (Ping Pay + NEAR Intents)
   ```
   @gitsplits pay 100 USDC to near-sdk-rs
   ```
   → Cross-chain distribution receipt

4. **Fiat Sponsor** (HOT Pay)
   → Show payment link for Web2 sponsor

---

## Sponsor Contact

| Sponsor | Resource |
|---------|----------|
| Ping Pay | https://pingpay.io/docs |
| EigenCloud | https://eigencloud.xyz/docs |
| NOVA | https://nova-sdk.com/docs |
| HOT Pay | https://hot-labs.org/pay/docs |
