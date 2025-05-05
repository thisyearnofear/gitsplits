# Farcaster Integration for GitSplits

This document outlines the plan for integrating GitSplits with Farcaster, a decentralized social network.

## Overview

GitSplits will be available as a bot on Farcaster, allowing users to interact with it through mentions and commands. The bot will analyze GitHub repositories, create splits, and manage fund distribution, similar to the Twitter integration.

## Implementation Steps

### 1. Create a Farcaster Bot Account

1. Sign up for a Neynar account at [dev.neynar.com](https://dev.neynar.com)
2. Create a bot account through the Neynar developer portal
3. Get the necessary API keys and signer UUID
4. Set up the bot profile with appropriate name, description, and profile picture

### 2. Set Up Webhook Server

1. Create a server to handle webhook events from Farcaster
2. Set up webhooks to listen for mentions of the bot
3. Implement authentication and verification for webhook events
4. Deploy the server to a reliable hosting provider

### 3. Implement Command Parsing

1. Parse mentions and extract commands from cast text
2. Implement command structure similar to Twitter integration:
   - `@gitsplits <repo>` - Analyze repository contributions
   - `@gitsplits create split <repo> [allocation]` - Create a split for a repository
   - `@gitsplits splits <repo>` - View active splits for a repository
   - `@gitsplits help` - Show help message

### 4. Implement Response Generation

1. Generate appropriate responses to commands
2. Format responses according to Farcaster's limitations and best practices
3. Implement error handling and user feedback

### 5. Integrate with Existing GitSplits Functionality

1. Reuse the GitHub repository analysis code
2. Reuse the smart contract integration code
3. Adapt the command structure for Farcaster

## Technical Architecture

### Farcaster Bot Server

The Farcaster bot server will be a Node.js application that:

1. Listens for webhook events from Neynar
2. Parses commands from mentions
3. Calls the appropriate GitSplits functions
4. Generates and posts responses

### Integration with GitSplits Core

The Farcaster bot will integrate with the GitSplits core functionality:

1. GitHub API integration for repository analysis
2. NEAR smart contract integration for split creation and management
3. Identity verification for fund distribution

## Command Structure

| Command | Description | Example |
|---------|-------------|---------|
| `<repo>` | Analyze repository contributions | `@gitsplits near/near-sdk-rs` |
| `create split <repo> [allocation]` | Create a split for a repository | `@gitsplits create split near/near-sdk-rs default` |
| `splits <repo>` | View active splits for a repository | `@gitsplits splits near/near-sdk-rs` |
| `help` | Show help message | `@gitsplits help` |

## Implementation Plan

### Phase 1: Setup and Basic Functionality

1. Create Farcaster bot account
2. Set up webhook server
3. Implement basic command parsing
4. Implement help command

### Phase 2: Core Functionality

1. Implement repository analysis command
2. Implement split creation command
3. Implement split viewing command

### Phase 3: Testing and Refinement

1. Test all commands with various repositories
2. Refine response formatting
3. Implement error handling and edge cases

### Phase 4: Deployment and Monitoring

1. Deploy bot server to production
2. Set up monitoring and logging
3. Announce bot availability to the community

## Resources

- [Neynar Documentation](https://docs.neynar.com/)
- [Farcaster Documentation](https://docs.farcaster.xyz/)
- [Neynar API Reference](https://docs.neynar.com/reference/quickstart)
