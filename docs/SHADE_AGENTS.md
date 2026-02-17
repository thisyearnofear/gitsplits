# Shade Agents Migration (Planned)

## Current Status

GitSplits is currently deployed on **EigenCompute** as a TEE-powered agent. While this provides:
- Verifiable execution via TEE attestations
- Hardware-secure computation
- Privacy for sensitive operations

It does not yet implement the full **Shade Agent** framework from NEAR.

## What Are Shade Agents?

[Shade Agents](https://docs.near.org/ai/shade-agents/getting-started/introduction) are TEE-powered agents that combine:
- **Trusted Execution Environments (TEE)** — Verifiable, secure compute
- **NEAR Chain Signatures** — Decentralized key management
- **Agent Smart Contracts** — Persistent accounts across TEE instances

### Key Difference

| Aspect | Current GitSplits | Shade Agent |
|--------|------------------|-------------|
| Key Management | Standard NEAR keys in TEE | Decentralized via chain signatures |
| Persistence | Keys lost if TEE fails | Persistent across any TEE instance |
| Multi-chain | NEAR only | Any chain (EVM, Solana, Bitcoin, etc.) |
| Resilience | Single TEE instance | Multiple instances can share state |

## Migration Benefits

1. **Resilience** — If our TEE goes down, another instance can take over without losing access to funds
2. **Multi-chain Native** — Sign transactions on any blockchain from the same agent
3. **True Decentralization** — Anyone can run our agent Docker image and participate
4. **Upgradability** — Code hash updates via DAO or timelock mechanisms

## Migration Requirements

1. **Deploy Shade Agent Contract** (Rust)
   - Agent registration with attestation verification
   - Code hash approval mechanism
   - `request_signature` function for chain signatures

2. **Integrate `shade-agent-api`**
   - Replace direct NEAR key usage
   - Call agent contract for transaction signing
   - Register on boot with TEE attestation

3. **Restructure Agent State**
   - Move state from agent memory to contract
   - Ensure stateless agent design
   - Enable multiple concurrent TEE instances

## Timeline

**Status:** Planned, not yet prioritized

This migration is on our roadmap but currently behind:
- Core payment functionality stabilization
- Farcaster bot reactivation
- Private repo analysis features

## Resources

- [Shade Agents Documentation](https://docs.near.org/ai/shade-agents/getting-started/introduction)
- [Chain Signatures](https://docs.near.org/concepts/abstraction/chain-signatures)
- [EigenCompute](https://eigencloud.xyz/)
