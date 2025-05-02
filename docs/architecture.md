# GitSplits Architecture

This document outlines the architecture of the GitSplits system, which enables GitHub repository contributors to receive fair compensation based on their contributions through smart contract splits.

## Overview

GitSplits consists of three main components:

1. **Worker Agent**: Processes X (Twitter) commands, analyzes GitHub repositories, and interacts with the NEAR smart contract.
2. **NEAR Smart Contract**: Manages repository splits and handles fund allocation to contributors.
3. **Identity Verification**: Links GitHub identities to blockchain accounts through a web interface.

## Worker Agent

The worker agent is responsible for:

- Processing X (Twitter) commands
- Analyzing GitHub repositories to determine contribution percentages
- Interacting with the NEAR smart contract
- Responding to user commands

### X Command Processing

The worker agent monitors X (Twitter) for mentions of `@gitsplits` followed by a command. When a command is detected, the agent parses the command and executes the appropriate action.

### GitHub Repository Analysis

When a user requests information about a repository or creates a split, the worker agent:

1. Fetches the repository's contributors from the GitHub API
2. Calculates the contribution percentages based on commit history
3. Formats the percentages for the NEAR smart contract (24 decimal places)

### NEAR Contract Interaction

The worker agent interacts with the NEAR smart contract to:

1. Create splits for repositories
2. Update splits with contributor information
3. Check split information

## NEAR Smart Contract

The NEAR smart contract is responsible for:

- Managing repository splits
- Handling fund allocation to contributors
- Verifying GitHub identities
- Allowing contributors to claim their portion

### Split Management

The smart contract stores split information, including:

- Repository URL
- Owner (creator of the split)
- Contributors (GitHub usernames and percentages)
- Creation timestamp

### Fund Allocation

The contract:

1. Receives funds sent to its address
2. Allocates funds to contributors based on split percentages
3. Allows verified contributors to claim their portion

### GitHub Identity Verification

The smart contract maintains a record of verified GitHub identities, linking GitHub usernames to blockchain accounts.

## Identity Verification

The identity verification system links GitHub identities to blockchain accounts through a web interface using the social-verifier library.

### GitHub Verification Process

1. User visits the verification web interface
2. User signs a message with their blockchain private key
3. User creates a GitHub gist with the signed message
4. User submits the gist ID to the verification system
5. System verifies the signature and links the GitHub username to the blockchain account

## Data Flow

1. User sends a command on X (Twitter)
2. Worker agent processes the command
3. Worker agent interacts with the GitHub API (if needed)
4. Worker agent interacts with the NEAR smart contract (if needed)
5. Worker agent responds to the user on X (Twitter)
6. User sends funds to the contract address via Bankrbot
7. Contributors verify their identity through the web interface
8. Contributors claim their portion of the funds

## Security Considerations

- **Smart Contract Security**: The smart contract is audited and follows best practices for secure smart contract development.
- **GitHub API Rate Limits**: The worker agent handles GitHub API rate limits to ensure reliable operation.
- **X (Twitter) API Rate Limits**: The worker agent handles X (Twitter) API rate limits to ensure reliable operation.
- **Private Key Management**: Private keys are stored securely and never exposed.
- **Identity Verification**: The verification process is secure and resistant to spoofing.

## Deployment Architecture

- **Worker Agent**: Deployed as a Docker container on a server or cloud provider.
- **NEAR Smart Contract**: Deployed on the NEAR mainnet.
- **Identity Verification**: Deployed as a web application.

## Future Enhancements

- **Permanent Splits**: Splits are permanent once created, with funds distributed according to the defined percentages.
- **Multi-Chain Support**: Support for more tokens and chains.
- **Streamlined Identity Verification**: Improve the identity verification process.
- **Private Repository Support**: Support for private GitHub repositories.
- **Custom Split Configurations**: Allow users to customize split configurations.
