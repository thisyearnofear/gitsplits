# X Command Reference

GitSplits X Agent can be controlled entirely through X (Twitter) using simple commands. This document provides a comprehensive reference for all available commands.

## Command Format

All commands follow this general format:

```
@bankrbot @gitsplits [command] [parameters]
```

Where:

- `@bankrbot` is the Bankrbot account
- `@gitsplits` is the GitSplits X Agent account
- `[command]` is the specific action to perform
- `[parameters]` are command-specific parameters

## Available Commands

### Repository Management

#### Create Split

Creates a new split configuration for a GitHub repository.

```
@bankrbot @gitsplits create [repo_url]
```

**Parameters:**

- `repo_url`: URL of the GitHub repository (e.g., `github.com/user/repo`)

**Example:**

```
@bankrbot @gitsplits create github.com/near/near-sdk-rs
```

**Response:**

```
✅ Split created for github.com/near/near-sdk-rs!
Split ID: split-123456
Contributors: 15
View details: https://gitsplits.example.com/splits/split-123456
```

#### Get Split Info

Retrieves information about a repository split.

```
@bankrbot @gitsplits info [repo_url]
```

**Parameters:**

- `repo_url`: URL of the GitHub repository

**Example:**

```
@bankrbot @gitsplits info github.com/near/near-sdk-rs
```

**Response:**

```
📊 Split info for github.com/near/near-sdk-rs:
Split ID: split-123456
Top contributors:
- austinabell: 25.4%
- evgenykuzyakov: 18.7%
- willemneal: 12.3%
...and 12 more
Total distributions: 3 (500 NEAR)
View details: https://gitsplits.example.com/splits/split-123456
```

#### Update Split

Updates the split configuration for a repository.

```
@bankrbot @gitsplits update [repo_url]
```

**Parameters:**

- `repo_url`: URL of the GitHub repository

**Example:**

```
@bankrbot @gitsplits update github.com/near/near-sdk-rs
```

**Response:**

```
🔄 Split updated for github.com/near/near-sdk-rs!
Contributors: 17 (2 new)
View details: https://gitsplits.example.com/splits/split-123456
```

### Fund Distribution

#### Distribute Funds

Distributes funds to contributors based on the split configuration.

```
@bankrbot @gitsplits distribute [repo_url] [amount] [token]
```

**Parameters:**

- `repo_url`: URL of the GitHub repository
- `amount`: Amount to distribute
- `token`: (Optional) Token to distribute (default: NEAR)

**Example:**

```
@bankrbot @gitsplits distribute github.com/near/near-sdk-rs 100 NEAR
```

**Response:**

```
💸 Distribution initiated for github.com/near/near-sdk-rs!
Amount: 100 NEAR
Recipients: 15 contributors
Distribution ID: dist-789012
Track status: https://gitsplits.example.com/distributions/dist-789012
```

#### Distribution Status

Checks the status of a distribution.

```
@bankrbot @gitsplits status [distribution_id]
```

**Parameters:**

- `distribution_id`: ID of the distribution to check

**Example:**

```
@bankrbot @gitsplits status dist-789012
```

**Response:**

```
📊 Distribution dist-789012 status:
Amount: 100 NEAR
Recipients: 15/15 completed
Transactions: 15/15 confirmed
View details: https://gitsplits.example.com/distributions/dist-789012
```

### GitHub Identity Verification

#### Verify GitHub Identity

Initiates GitHub identity verification to link a GitHub account to a wallet.

```
@bankrbot @gitsplits verify [github_username]
```

**Parameters:**

- `github_username`: GitHub username to verify

**Example:**

```
@bankrbot @gitsplits verify johndoe
```

**Response:**

```
🔍 Verification initiated for GitHub user: johndoe
Complete verification at: https://gitsplits.example.com/verify/ver-123456
Verification expires in 24 hours
```

#### Check Verification Status

Checks the status of a GitHub identity verification.

```
@bankrbot @gitsplits verification [github_username]
```

**Parameters:**

- `github_username`: GitHub username to check

**Example:**

```
@bankrbot @gitsplits verification johndoe
```

**Response:**

```
✅ GitHub user johndoe is verified!
Linked to: johndoe.near
Verified on: April 25, 2025
```

### Miscellaneous Commands

#### Help

Displays help information about available commands.

```
@bankrbot @gitsplits help
```

**Example:**

```
@bankrbot @gitsplits help
```

**Response:**

```
🤖 GitSplits X Agent Commands:
- create [repo_url]: Create a new split
- info [repo_url]: Get split information
- update [repo_url]: Update split configuration
- distribute [repo_url] [amount] [token]: Distribute funds
- status [distribution_id]: Check distribution status
- verify [github_username]: Verify GitHub identity
- verification [github_username]: Check verification status
- help: Display this help message

Learn more: https://gitsplits.example.com/docs
```

#### Version

Displays the current version of GitSplits X Agent.

```
@bankrbot @gitsplits version
```

**Example:**

```
@bankrbot @gitsplits version
```

**Response:**

```
GitSplits X Agent v1.0.0
Built with NEAR Shade Agents
Worker: TEE-secured (Phala Cloud)
Contract: gitsplits.near
```

## Error Handling

When a command fails, GitSplits X Agent will respond with an error message explaining the issue:

```
❌ Error: Repository not found: github.com/user/nonexistent-repo
Please check the repository URL and try again.
```

Common error types:

- Repository not found
- Invalid command format
- Insufficient permissions
- GitHub API rate limit exceeded
- Verification expired
- Distribution failed

## Command Rate Limits

To prevent abuse, the following rate limits apply:

- 10 commands per user per hour
- 3 distribution commands per user per day
- 5 verification attempts per GitHub username per day

## Hybrid Flow (X + Web)

Some commands may require additional steps that are better completed on the web. In these cases, GitSplits X Agent will provide a link to continue the process on the web.

### Long Responses

When a response is too long for X (exceeds 280 characters), GitSplits X Agent will provide a shortened version with a link to view the full message:

```
📊 Split info for github.com/near/near-sdk-rs:
Top contributors:
- austinabell: 25.4%
- evgenykuzyakov: 18.7%
...

View full message: https://gitsplits.example.com/messages/msg-123456
```

### Verification Flow

The GitHub identity verification process is a hybrid flow:

1. User initiates verification on X: `@bankrbot @gitsplits verify johndoe`
2. GitSplits X Agent responds with a link to complete verification on the web
3. User completes verification on the web by adding a verification code to their GitHub profile
4. User can check verification status on X: `@bankrbot @gitsplits verification johndoe`

## Notes

- All commands are case-insensitive
- Repository URLs can be in various formats (e.g., `github.com/user/repo`, `https://github.com/user/repo`, or just `user/repo`)
- Token amounts must be positive numbers
- Token types are case-sensitive (e.g., `NEAR`, `ETH`, `USDC`)
- Distribution IDs and verification IDs are provided in command responses and are needed for status checks
- For security reasons, some operations may require additional verification steps on the web
