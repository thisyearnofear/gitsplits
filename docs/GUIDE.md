# GitSplits User Guide

AI-powered application for compensating open source contributors via natural language commands.

## Quick Start

```
@gitsplits pay 100 USDC to github.com/near/near-sdk-rs
```

The application analyzes the repository, calculates fair splits, and distributes funds to verified contributors.

## Command Reference

### Analyze Repository

Get contribution breakdown without creating a split.

```
@gitsplits analyze github.com/near/near-sdk-rs
@gitsplits who contributes to react?
@gitsplits show contributors for next.js
```

**Response includes:** Top contributors, contribution percentages, suggested allocation.

---

### Create Split

Create a revenue split for a repository.

```
@gitsplits create split for github.com/near/near-sdk-rs
@gitsplits set up payments for facebook/react
@gitsplits create split for near/near-sdk-rs with 50/30/20
```

**Default allocation:** Based on commit history (lines changed, commits, PRs).

---

### Pay Contributors

Distribute funds to all contributors of a repository.

```
@gitsplits pay 100 USDC to github.com/near/near-sdk-rs
@gitsplits send 50 NEAR to the React contributors
@gitsplits distribute $200 to next.js
```

**Requirements:**
- Split must exist for the repository
- Contributors must have verified wallets (one-time setup)

**What happens:**
1. Application analyzes the repository
2. Looks up verified wallets for contributors
3. Executes cross-chain distribution via Ping Pay
4. Replies with transaction receipt

---

### Verify Identity (One-Time Setup)

Link your GitHub to your wallet to receive payments.

```
DM @gitsplits: verify your-github-username
```

**Flow:**
1. Application generates unique verification code
2. You create a GitHub gist with the code
3. Application verifies and links your identities
4. Future payments go directly to your wallet

---

### View Split

Get information about a specific split.

```
@gitsplits show split split-abc123
@gitsplits info for split-xyz789
```

---

### List Splits

View all splits for a repository.

```
@gitsplits show splits for near/near-sdk-rs
@gitsplits what splits exist for next.js?
```

---

### Check Pending Claims

View pending distributions for unverified contributors.

```
@gitsplits pending my-org/my-repo
```

---

### Help

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

- **Agent Chat**: https://gitsplits.vercel.app/agent
- **Verify Identity**: https://gitsplits.vercel.app/verify
- **View Splits**: https://gitsplits.vercel.app/splits
- **Dashboard**: https://gitsplits.vercel.app/dashboard

The web interface and Farcaster bot share the same state.

---

## For Contributors

1. **Verify once:** `DM @gitsplits: verify your-github-username`
2. **Receive payments automatically** when someone pays your repo

## For Repository Owners

1. **Analyze:** `@gitsplits analyze my-org/my-repo`
2. **Create split:** `@gitsplits create split for my-org/my-repo`
3. **Pay contributors:** `@gitsplits pay 100 USDC to my-org/my-repo`
4. **Check pending:** `@gitsplits pending my-org/my-repo`
