# Smart Contract API

The GitSplits X Agent smart contract is deployed on NEAR and provides the following functionality:

## Worker Agent Management

### `register_worker`

Registers a new worker agent by verifying its remote attestation and code hash.

```rust
pub fn register_worker(&mut self, attestation: Attestation, code_hash: String) -> bool
```

**Parameters:**
- `attestation`: Remote attestation data from the TEE
- `code_hash`: SHA256 hash of the Docker image

**Returns:**
- `bool`: True if registration was successful

### `is_worker_registered`

Checks if a worker agent is registered and valid.

```rust
pub fn is_worker_registered(&self, account_id: AccountId) -> bool
```

**Parameters:**
- `account_id`: NEAR account ID of the worker agent

**Returns:**
- `bool`: True if the worker is registered

## Repository Management

### `create_split`

Creates a new split configuration for a GitHub repository.

```rust
pub fn create_split(&mut self, repo_url: String, owner: AccountId) -> SplitId
```

**Parameters:**
- `repo_url`: URL of the GitHub repository
- `owner`: NEAR account ID of the split owner

**Returns:**
- `SplitId`: Unique identifier for the created split

### `update_split`

Updates the split configuration for a repository.

```rust
pub fn update_split(&mut self, split_id: SplitId, contributors: Vec<Contributor>) -> bool
```

**Parameters:**
- `split_id`: ID of the split to update
- `contributors`: List of contributors with their percentages

**Returns:**
- `bool`: True if update was successful

### `get_split`

Retrieves the split configuration for a repository.

```rust
pub fn get_split(&self, split_id: SplitId) -> Option<Split>
```

**Parameters:**
- `split_id`: ID of the split to retrieve

**Returns:**
- `Option<Split>`: Split configuration if found

## Fund Distribution

### `distribute_funds`

Distributes funds to contributors based on the split configuration.

```rust
pub fn distribute_funds(&mut self, split_id: SplitId, amount: U128, token_id: Option<String>) -> bool
```

**Parameters:**
- `split_id`: ID of the split to distribute funds for
- `amount`: Amount to distribute
- `token_id`: Optional token ID for non-NEAR tokens

**Returns:**
- `bool`: True if distribution was successful

### `get_distribution_history`

Retrieves the distribution history for a split.

```rust
pub fn get_distribution_history(&self, split_id: SplitId) -> Vec<Distribution>
```

**Parameters:**
- `split_id`: ID of the split to retrieve history for

**Returns:**
- `Vec<Distribution>`: List of past distributions

## GitHub Identity Verification

### `verify_github_identity`

Verifies a GitHub identity and links it to a NEAR account.

```rust
pub fn verify_github_identity(&mut self, github_username: String, account_id: AccountId) -> bool
```

**Parameters:**
- `github_username`: GitHub username to verify
- `account_id`: NEAR account ID to link

**Returns:**
- `bool`: True if verification was successful

### `get_github_identity`

Retrieves the GitHub identity linked to a NEAR account.

```rust
pub fn get_github_identity(&self, account_id: AccountId) -> Option<String>
```

**Parameters:**
- `account_id`: NEAR account ID to look up

**Returns:**
- `Option<String>`: GitHub username if found

## Chain Signatures

### `generate_chain_signature`

Generates a chain signature for a cross-chain transaction.

```rust
pub fn generate_chain_signature(&self, chain_id: String, tx_data: String) -> ChainSignature
```

**Parameters:**
- `chain_id`: ID of the target blockchain
- `tx_data`: Transaction data to sign

**Returns:**
- `ChainSignature`: Generated signature for the transaction

## Data Structures

### `Split`

```rust
pub struct Split {
    pub id: SplitId,
    pub repo_url: String,
    pub owner: AccountId,
    pub contributors: Vec<Contributor>,
    pub created_at: u64,
    pub updated_at: u64,
}
```

### `Contributor`

```rust
pub struct Contributor {
    pub github_username: String,
    pub account_id: Option<AccountId>,
    pub percentage: U128,
}
```

### `Distribution`

```rust
pub struct Distribution {
    pub id: DistributionId,
    pub split_id: SplitId,
    pub amount: U128,
    pub token_id: Option<String>,
    pub timestamp: u64,
    pub transactions: Vec<Transaction>,
}
```

### `Transaction`

```rust
pub struct Transaction {
    pub chain_id: String,
    pub recipient: String,
    pub amount: String,
    pub tx_hash: Option<String>,
    pub status: TransactionStatus,
}
```

### `Attestation`

```rust
pub struct Attestation {
    pub quote: String,
    pub endorsements: String,
}
```

### `ChainSignature`

```rust
pub struct ChainSignature {
    pub signature: String,
    pub public_key: String,
    pub chain_id: String,
}
```
