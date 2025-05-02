# GitSplits Contracts

This directory contains the smart contracts for the GitSplits application.

## Contracts

- `near/`: NEAR smart contract for GitSplits

## NEAR Contract

The NEAR contract is responsible for:

1. Managing repository splits
2. Verifying GitHub identities
3. Handling fund distribution
4. Generating chain signatures

### Building the Contract

```bash
cd near
cargo near build
```

### Deploying the Contract

```bash
export NEAR_ENV=mainnet
near deploy gitsplits-worker.papajams.near target/near/gitsplits_x_agent.wasm
```

### Initializing the Contract

```bash
export NEAR_ENV=mainnet
near call gitsplits-worker.papajams.near new '{"owner_id": "papajams.near"}' --accountId papajams.near
```

## Notes

For more detailed information about the contract deployment, see the [PRIVATE_DEPLOYMENT_DETAILS.md](../PRIVATE_DEPLOYMENT_DETAILS.md) file.
