# GitSplits NEAR Contract Details

## Deployment Information

- **Contract Account ID**: `gitsplits-test.testnet`
- **Network**: NEAR Testnet
- **Deployment Date**: $(date +"%Y-%m-%d")
- **Contract Binary**: `/target/near/gitsplits_x_agent.wasm`
- **Contract ABI**: `/target/near/gitsplits_x_agent_abi.json`

## Contract Checksums

- **SHA-256 (hex)**: `aa9bbfb28d86baab5e9d14164267892591e36d7884e26c0e09c4299c25d4e75e`
- **SHA-256 (bs58)**: `CUz47XTS6DXcAidhdKryn8ocZoLchJKM7QrymZDGA8M3`

## Deployment Transactions

- **Deploy Transaction**: [HNocv31Z3cFqCchxUW6W68jVXcTPzszdQjY8u1StygiJ](https://testnet.nearblocks.io/txns/HNocv31Z3cFqCchxUW6W68jVXcTPzszdQjY8u1StygiJ)
- **Initialize Transaction**: [GdYNX78RNL6DziQXtpUv8QokVQXdgzjw21i7y5JVJYMS](https://testnet.nearblocks.io/txns/GdYNX78RNL6DziQXtpUv8QokVQXdgzjw21i7y5JVJYMS)

## Contract Methods

### View Methods

- `is_worker_registered(account_id: AccountId) -> bool`
- `get_split(split_id: SplitId) -> Option<Split>`
- `get_split_by_repo(repo_url: String) -> Option<Split>`

### Call Methods

- `register_worker(attestation: Attestation, code_hash: String) -> bool`
- `create_split(repo_url: String, owner: AccountId) -> SplitId`
- `update_split(split_id: SplitId, contributors: Vec<Contributor>) -> bool`
- `generate_chain_signature(chain_id: String, tx_data: String) -> ChainSignature`

## Example Usage

### Register a Worker

```bash
near call gitsplits-test.testnet register_worker '{"_attestation": {"quote": "test", "endorsements": "test"}, "code_hash": "test_hash"}' --accountId YOUR_ACCOUNT_ID.testnet
```

### Create a Split

```bash
near call gitsplits-test.testnet create_split '{"repo_url": "github.com/user/repo", "owner": "YOUR_ACCOUNT_ID.testnet"}' --accountId YOUR_ACCOUNT_ID.testnet
```

### Check Worker Registration

```bash
near view gitsplits-test.testnet is_worker_registered '{"account_id": "YOUR_ACCOUNT_ID.testnet"}'
```

## Notes

- This contract is currently deployed on the NEAR testnet for development and testing purposes.
- For production use, deploy to NEAR mainnet with appropriate security measures.
- Keep the contract account credentials secure.
