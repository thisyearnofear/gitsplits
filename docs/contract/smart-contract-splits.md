# Smart Contract Split System

This document outlines the smart contract split system used by GitSplits to distribute funds to GitHub repository contributors.

## Overview

The smart contract split system enables:

1. Creating splits for GitHub repositories with contributor information
2. Receiving funds for distribution to contributors
3. Verifying GitHub identities
4. Allowing contributors to claim their portion of the funds

## Smart Contract Structure

The smart contract consists of the following components:

### Data Structures

#### Split

Represents a repository split with contributor information:

```rust
pub struct Split {
    pub id: String,
    pub repo_url: String,
    pub owner: AccountId,
    pub contributors: Vec<Contributor>,
    pub created_at: Timestamp,
}
```

#### Contributor

Represents a contributor to a repository:

```rust
pub struct Contributor {
    pub github_username: String,
    pub account_id: Option<AccountId>,
    pub percentage: String, // Percentage with 24 decimal places (100% = 10^24)
}
```

#### GithubVerification

Represents a verified GitHub identity:

```rust
pub struct GithubVerification {
    pub github_username: String,
    pub account_id: AccountId,
    pub verified_at: Timestamp,
}
```

### Contract State

The contract maintains the following state:

```rust
pub struct GitSplits {
    pub owner_id: AccountId,
    pub splits: UnorderedMap<String, Split>,
    pub splits_by_repo: LookupMap<String, Vec<String>>,
    pub github_verifications: LookupMap<String, GithubVerification>,
    pub account_to_github: LookupMap<AccountId, String>,
}
```

## Contract Functions

### Split Management

#### create_split

Creates a new split for a repository:

```rust
pub fn create_split(&mut self, repo_url: String, owner: AccountId, contributors: Vec<Contributor>) -> String
```

#### update_split

Updates a split with contributors:

```rust
pub fn update_split(&mut self, split_id: String, contributors: Vec<Contributor>) -> bool
```

#### get_split

Gets a split by ID:

```rust
pub fn get_split(&self, split_id: String) -> Option<Split>
```

#### get_splits_by_repo

Gets all splits for a repository:

```rust
pub fn get_splits_by_repo(&self, repo_url: String) -> Vec<Split>
```

### Fund Management

#### receive_funds

Receives funds for a split:

```rust
#[payable]
pub fn receive_funds(&mut self, split_id: String)
```

#### claim_funds

Allows a contributor to claim their portion of the funds:

```rust
pub fn claim_funds(&mut self, split_id: String) -> Promise
```

### GitHub Verification

#### verify_github

Verifies a GitHub identity:

```rust
pub fn verify_github(&mut self, github_username: String, signature: String) -> bool
```

#### is_github_verified

Checks if a GitHub username is verified:

```rust
pub fn is_github_verified(&self, github_username: String) -> bool
```

#### get_github_verification

Gets GitHub verification details:

```rust
pub fn get_github_verification(&self, github_username: String) -> Option<GithubVerification>
```

#### get_github_username

Gets the GitHub username for an account:

```rust
pub fn get_github_username(&self, account_id: AccountId) -> Option<String>
```

## Split Flow

1. **Analyze Repository**: The worker agent analyzes a GitHub repository and determines contribution percentages.
2. **Create Split**: A user creates a split for a repository, specifying the repository URL, owner, and contributors.
3. **Receive Funds**: Users send funds to the contract address for a specific split.
4. **Verify GitHub Identity**: Contributors verify their GitHub identity by linking it to their blockchain account.
5. **Claim Funds**: Verified contributors claim their portion of the funds.

## Security Considerations

- **Percentage Validation**: The contract ensures that the total percentage of all contributors adds up to 100%.
- **Ownership Checks**: Only the owner of a split can update it.
- **Verification Checks**: Only verified GitHub identities can claim funds.
- **Duplicate Claim Prevention**: Contributors can only claim their portion once.

## Testing

The contract includes comprehensive tests to ensure correct behavior:

- **Split Creation and Update**: Tests for creating and updating splits.
- **Fund Reception and Claiming**: Tests for receiving funds and claiming them.
- **GitHub Verification**: Tests for verifying GitHub identities.
- **Edge Cases**: Tests for various edge cases and error conditions.

## Future Enhancements

- **Split Expiration**: Add support for split expiration and fund management.
- **Multi-Chain Support**: Support for more tokens and chains.
- **Custom Split Configurations**: Allow users to customize split configurations.
- **Split Templates**: Create reusable split templates for common scenarios.
