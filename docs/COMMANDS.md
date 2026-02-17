# GitSplits Commands

Just mention @gitsplits on Farcaster with natural language. No setup required.

## Quick Examples

```
@gitsplits pay 100 USDC to the React team
@gitsplits create a split for github.com/near/near-sdk-rs
@gitsplits who are the top contributors to next.js?
@gitsplits show me splits for near/near-sdk-rs
```

## Command Reference

### Pay Contributors

Send funds to all contributors of a repository.

**Examples:**
```
@gitsplits pay 100 USDC to github.com/near/near-sdk-rs
@gitsplits send 50 NEAR to the React contributors
@gitsplits distribute $200 to next.js
```

**What happens:**
1. Agent analyzes the repository
2. Looks up verified wallets for contributors
3. Executes cross-chain distribution via Ping Pay
4. Replies with transaction receipt

**Requirements:**
- Split must exist for the repository
- Contributors must have verified wallets (one-time setup)

---

### Create Split

Create a new revenue split for a repository.

**Examples:**
```
@gitsplits create a split for github.com/near/near-sdk-rs
@gitsplits set up payments for facebook/react
@gitsplits make a split for next.js with default allocations
```

**With custom allocations:**
```
@gitsplits create split for near/near-sdk-rs with 50/30/20
```

**Default allocation:** Based on commit history (lines changed, commits, PRs)

---

### Verify Identity (One-Time Setup)

Link your GitHub to your Farcaster and wallet to receive payments.

**Via DM (recommended):**
```
DM @gitsplits: verify your-github-username
```

**What happens:**
1. Agent generates unique verification code
2. You create a GitHub gist with the code
3. Agent verifies and links your identities
4. Future payments go directly to your wallet

**Why verify:**
- Required to receive payments
- Enables automatic distribution
- One-time setup

---

### Analyze Repository

Get contribution breakdown without creating a split.

**Examples:**
```
@gitsplits analyze github.com/near/near-sdk-rs
@gitsplits who contributes to react?
@gitsplits show contributors for next.js
```

**Response includes:**
- Top contributors by commit count
- Contribution percentages
- Suggested allocation

---

### View Split

Get information about a specific split.

**Examples:**
```
@gitsplits show split split-abc123
@gitsplits info for split-xyz789
```

---

### List Splits

View all splits for a repository.

**Examples:**
```
@gitsplits show splits for near/near-sdk-rs
@gitsplits what splits exist for next.js?
```

---

### Help

Get help with commands.

```
@gitsplits help
@gitsplits what can you do?
```

---

## Natural Language Tips

GitSplits understands varied phrasing. You don't need exact syntax.

**These all work:**
```
@gitsplits pay 100 USDC to near-sdk-rs
@gitsplits send 100 usdc to github.com/near/near-sdk-rs
@gitsplits distribute $100 in USDC to the near sdk contributors
@gitsplits give 100 USDC to near/near-sdk-rs team
```

**Repository formats accepted:**
- `github.com/near/near-sdk-rs`
- `near/near-sdk-rs`
- `near-sdk-rs` (if mentioned before)

---

## Error Messages

| Error | Meaning | Fix |
|-------|---------|-----|
| "No split found" | Repository hasn't been set up | Ask owner to create a split |
| "GitHub not verified" | You haven't linked your identity | DM @gitsplits to verify |
| "Insufficient balance" | Sender doesn't have enough tokens | Fund your wallet |

---

## Web Interface

Some actions are easier on the web:

- **Web Agent**: https://gitsplits.xyz/agent (Interactive chat interface)
- **Verify identity**: https://gitsplits.xyz/verify
- **View splits**: https://gitsplits.xyz/splits
- **Manage settings**: https://gitsplits.xyz/dashboard

The web interface and Farcaster agent share the same state.
