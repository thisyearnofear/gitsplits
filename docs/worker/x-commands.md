# GitSplits X Commands

This document outlines the X (Twitter) commands supported by the GitSplits agent.

## Command Format

All commands should mention `@gitsplits` followed by the command and any required parameters.

## Available Commands

### Repository Analysis

```
@gitsplits <repo>
```

Analyzes a GitHub repository and responds with suggested splits based on contribution history.

**Parameters:**

- `<repo>`: GitHub repository URL or name (e.g., `github.com/near/near-sdk-rs` or `near/near-sdk-rs`)

**Example:**

```
@gitsplits github.com/near/near-sdk-rs
```

**Response:**

```
📊 Analysis for github.com/near/near-sdk-rs:

Contributors:
- austinabell: 35.2%
- willemneal: 28.7%
- evgenykuzyakov: 15.5%
- ...

To create a split with these percentages:
@gitsplits create split github.com/near/near-sdk-rs default

Or specify custom percentages:
@gitsplits create split github.com/near/near-sdk-rs 35/29/16/...
```

### Create Split

```
@gitsplits create split <repo> [allocation]
```

Creates a smart contract split for a repository with either default percentages based on contribution history or custom allocations.

**Parameters:**

- `<repo>`: GitHub repository URL or name
- `[allocation]`: (Optional) Custom allocation percentages. Use `default` for contribution-based percentages or specify percentages separated by slashes (e.g., `50/30/20`)

**Examples:**

```
@gitsplits create split github.com/near/near-sdk-rs default
```

```
@gitsplits create split github.com/near/near-sdk-rs 50/30/20
```

**Response:**

```
✅ Split created for github.com/near/near-sdk-rs!

Split ID: split-1234567890

Contributors:
- austinabell: 35.2%
- willemneal: 28.7%
- evgenykuzyakov: 15.5%
- ...

To view this split:
@gitsplits split split-1234567890
```

### View Splits

```
@gitsplits splits <repo>
```

Shows active splits for a repository.

**Parameters:**

- `<repo>`: GitHub repository URL or name

**Example:**

```
@gitsplits splits github.com/near/near-sdk-rs
```

**Response:**

```
📋 Splits for github.com/near/near-sdk-rs:

Split ID: split-1234567890
Created by: papajams.near
Contributors: 8
Created: 2023-05-01 12:34:56

For more details:
@gitsplits split split-1234567890
```

### View Split Details

```
@gitsplits split <split_id>
```

Shows details for a specific split.

**Parameters:**

- `<split_id>`: Split ID

**Example:**

```
@gitsplits split split-1234567890
```

**Response:**

```
📊 Split Details:

Split ID: split-1234567890
Repository: github.com/near/near-sdk-rs
Owner: papajams.near
Created: 2023-05-01 12:34:56

Contributors:
- austinabell: 35.2%
- willemneal: 28.7%
- evgenykuzyakov: 15.5%
- ...

To distribute funds to this split, use Bankrbot.
```

### Verify GitHub Identity

```
@gitsplits verify <github_username>
```

Provides information on how to verify your GitHub identity.

**Parameters:**

- `<github_username>`: Your GitHub username

**Example:**

```
@gitsplits verify papajams
```

**Response:**

```
🔐 GitHub Verification:

To verify your GitHub identity (papajams), please visit:
https://gitsplits.xyz/verify

This will allow you to claim your portion of any splits you're included in.
```

### Help

```
@gitsplits help
```

Shows help information about available commands.

**Example:**

```
@gitsplits help
```

**Response:**

```
🔍 GitSplits Commands:

- @gitsplits <repo>: Analyze repository contributions
- @gitsplits create split <repo> [allocation]: Create a split
- @gitsplits splits <repo>: View active splits for a repository
- @gitsplits split <split_id>: View split details
- @gitsplits help: Show this help message

For more information, visit: https://gitsplits.xyz
```

## Parameter Formats

### Repository

You can specify a repository in two formats:

1. **Full URL**: `github.com/owner/repo`
2. **Short Name**: `owner/repo`

Examples:

- `github.com/near/near-sdk-rs`
- `near/near-sdk-rs`

### Allocation

You can specify allocation percentages in two ways:

1. **Default**: Use `default` to use contribution-based percentages
2. **Custom**: Specify percentages separated by slashes (e.g., `50/30/20`)

The percentages should add up to 100%.

## Error Handling

The agent will respond with appropriate error messages if:

- The repository doesn't exist
- The repository is private and not accessible
- The allocation percentages don't add up to 100%
- The split ID doesn't exist
- The command format is invalid

## Examples

### Analyzing a Repository

```
@gitsplits github.com/near/near-sdk-rs
```

This command will analyze the repository and show the contribution percentages of each contributor.

### Creating a Split with Default Percentages

```
@gitsplits create split github.com/near/near-sdk-rs default
```

This command will create a split using the contribution percentages from the repository analysis.

### Creating a Split with Custom Percentages

```
@gitsplits create split github.com/near/near-sdk-rs 50/30/20
```

This command will create a split with custom percentages for the top 3 contributors.

### Viewing Splits for a Repository

```
@gitsplits splits github.com/near/near-sdk-rs
```

This command will show all splits created for the repository.

### Viewing Split Details

```
@gitsplits split split-1234567890
```

This command will show detailed information about a specific split.

<!-- Legacy commands section removed -->

## Future Commands

The following commands are planned for future releases:

- `@gitsplits claim <split_id>`: Claim funds from a split (will redirect to web interface)
- `@gitsplits template <template_name> <repo>`: Create a split using a template
