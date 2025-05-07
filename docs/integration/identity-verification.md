# Identity Verification System

This document outlines the identity verification system used by GitSplits to link GitHub identities to blockchain accounts.

## Overview

The identity verification system enables:

1. Linking GitHub identities to blockchain accounts
2. Verifying ownership of both the GitHub account and the blockchain account
3. Allowing verified users to claim their portion of funds from splits

## Verification Process

The verification process consists of the following steps:

### 1. Initiate Verification

The user initiates the verification process by visiting the GitSplits verification web interface.

### 2. Connect Blockchain Wallet

The user connects their blockchain wallet to the verification interface. This can be:
- NEAR wallet (e.g., MyNearWallet, Bitte)
- Ethereum wallet (e.g., MetaMask)
- Solana wallet (e.g., Phantom)

### 3. Sign Message

The user signs a message with their blockchain private key. The message includes:
- The user's GitHub username
- A timestamp
- A nonce for security

Example message:
```
I'm verifying my GitHub account with username 'username' for GitSplits.
Timestamp: 1620000000
Nonce: 123456
```

### 4. Create GitHub Gist

The user creates a public GitHub gist with the following content:
- The signed message from step 3
- The user's blockchain account address

### 5. Submit Verification

The user submits the gist URL to the verification interface.

### 6. Verification

The verification system:
1. Fetches the gist content
2. Verifies that the gist was created by the claimed GitHub user
3. Verifies the signature using the connected blockchain wallet
4. Links the GitHub username to the blockchain account in the smart contract

### 7. Confirmation

The user receives confirmation that their GitHub identity has been linked to their blockchain account.

## Technical Implementation

The identity verification system uses the social-verifier library to implement the verification process.

### GitHub Verification

```typescript
import { githubAuthorize, githubVerify } from "@cyberlab/social-verifier";

// Step 3: Sign message
const signature = await githubAuthorize(provider, address, username);

// Step 6: Verify
const result = await githubVerify(address, gistId, "gitsplits");
```

### Smart Contract Integration

The verification result is stored in the smart contract:

```rust
pub fn verify_github(&mut self, github_username: String, signature: String) -> bool {
    // Verify the signature
    // ...
    
    // Store the verification
    let verification = GithubVerification {
        github_username: github_username.clone(),
        account_id: env::predecessor_account_id(),
        verified_at: env::block_timestamp(),
    };
    
    self.github_verifications.insert(&github_username, &verification);
    self.account_to_github.insert(&env::predecessor_account_id(), &github_username);
    
    true
}
```

## Security Considerations

The identity verification system includes several security measures:

### Signature Verification

The system verifies that the signature was created by the owner of the blockchain account.

### GitHub Ownership Verification

The system verifies that the gist was created by the claimed GitHub user.

### Timestamp and Nonce

The message includes a timestamp and nonce to prevent replay attacks.

### Public Gist

The gist must be public to allow verification.

## User Experience

The verification process is designed to be as user-friendly as possible:

1. Clear instructions at each step
2. Visual feedback on progress
3. Helpful error messages if something goes wrong
4. Confirmation when verification is complete

## Integration with GitSplits

The identity verification system is integrated with GitSplits in the following ways:

### Claiming Funds

Verified users can claim their portion of funds from splits:

```rust
pub fn claim_funds(&mut self, split_id: String) -> Promise {
    // Get the caller's account ID
    let account_id = env::predecessor_account_id();
    
    // Check if the caller has verified their GitHub identity
    let github_username = self
        .account_to_github
        .get(&account_id)
        .expect("GitHub identity not verified");
    
    // Find the contributor in the split
    // ...
    
    // Transfer the funds
    // ...
}
```

### X Commands

Users are directed to the verification web interface when they use the `verify` command on X (Twitter):

```
@gitsplits verify username
```

Response:
```
To verify your GitHub identity, please visit:
https://gitsplits.xyz/verify?username=username
```

## Future Enhancements

The identity verification system will be enhanced in the following ways:

- **Streamlined Verification**: Simplify the verification process
- **Multiple Blockchain Accounts**: Link a GitHub identity to multiple blockchain accounts
- **Verification Expiration**: Add expiration to verifications to ensure they remain current
- **Verification Revocation**: Allow users to revoke their verifications
- **OAuth Integration**: Use GitHub OAuth for a more seamless verification process
