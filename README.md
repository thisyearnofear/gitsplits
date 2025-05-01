# GitSplits X Agent

## Overview

GitSplits X Agent is an autonomous agent built on the NEAR Shade Agents stack that enables GitHub repository contributors to receive fair compensation based on their contributions. Users interact with the agent entirely through X (Twitter), making it easy to create and manage revenue splits for any GitHub repository.

![GitSplits X Agent Banner](https://placeholder-for-banner-image.com)

## 🚀 Features

- **X-Native Interaction**: Interact with GitSplits directly through X using simple, intuitive commands
- **Automatic Contribution Analysis**: Analyze GitHub repositories to determine fair contribution splits
- **Multi-Chain Fund Distribution**: Distribute funds across multiple blockchains to contributors
- **GitHub Identity Verification**: Securely link GitHub identities to crypto wallets
- **Transparent Split Management**: Create, view, and update splits with full transparency
- **Web Dashboard**: Monitor all agent activity through our web interface
- **Original Creator Recognition**: Automatically identify and compensate original repository creators
- **Contribution Incentives**: Set up bounties for specific tasks to encourage community contributions

## 🤖 How It Works

GitSplits X Agent combines the power of NEAR Shade Agents with Bankrbot to create a seamless experience:

1. **Command GitSplits on X**: Mention `@bankrbot @gitsplits` with a simple command
2. **Smart Repository Matching**: The agent intelligently identifies your repository
3. **Secure Verification**: Security checks ensure proper attribution and prevent abuse
4. **On-Chain Recording**: All actions are verified and recorded on-chain
5. **Funds Distribution**: Funds are automatically distributed to contributors based on their GitHub activity

## 📋 User-Friendly X Commands

Interact with GitSplits using these intuitive commands on X:

| Command                                              | Description                            | Example                                                  |
| ---------------------------------------------------- | -------------------------------------- | -------------------------------------------------------- |
| `@bankrbot @gitsplits create myrepo`                 | Create a new split for your repository | `@bankrbot @gitsplits create near-sdk-rs`                |
| `@bankrbot @gitsplits distribute 100 NEAR to myrepo` | Distribute funds to contributors       | `@bankrbot @gitsplits distribute 100 NEAR to my-project` |
| `@bankrbot @gitsplits verify johndoe`                | Link your GitHub identity              | `@bankrbot @gitsplits verify myusername`                 |
| `@bankrbot @gitsplits info myrepo`                   | Get split information                  | `@bankrbot @gitsplits info my-project`                   |
| `@bankrbot @gitsplits help`                          | Get help with commands                 | `@bankrbot @gitsplits help`                              |

> **Note**: For maximum precision, you can always use the full repository URL as a fallback: `@bankrbot @gitsplits create github.com/user/repo`

The agent understands natural language, so you can also use commands like:

- `@bankrbot @gitsplits make a split for my-project`
- `@bankrbot @gitsplits send 50 NEAR to contributors of my-project`
- `@bankrbot @gitsplits show me info about my-project`

## 🔒 Security Architecture

GitSplits X Agent is built with security at its core, balancing user-friendliness with robust protection:

### 1. Worker Agent (TEE-Secured)

- Runs in a Trusted Execution Environment (TEE) on NEAR AI Hub
- Processes X commands and GitHub API requests
- Generates and signs transactions using ephemeral keys
- Verifies GitHub identities and contribution data

### 2. NEAR Smart Contract

- Verifies worker agent attestations
- Manages repository split configurations
- Handles fund distribution logic
- Uses chain signatures for cross-chain transactions

### 3. Multi-Chain Integration

- Leverages NEAR's chain signatures for cross-chain transactions
- Supports fund distribution on Ethereum, Solana, and other major chains
- Ensures secure and verifiable transactions across blockchains

### 4. Identity Verification System

- **Tiered Verification Levels**:
  - Level 1: Basic X account verification
  - Level 2: GitHub account linking
  - Level 3: Repository ownership proof
- **Progressive Security**: Higher-value actions require stronger verification
- **GitHub-X Linking**: Secure methods to verify ownership of both accounts

### 5. Anti-Gaming Protections

- **Sophisticated Contribution Analysis**: Beyond simple commit counts
- **Time-Based Restrictions**: Minimum repository age requirements
- **Suspicious Activity Detection**: Monitoring for manipulation attempts
- **Transparent Attribution**: Public records of all splits and distributions

## 🛡️ Security & UX Balance

GitSplits X Agent implements security measures that feel natural in the user flow:

1. **Progressive Security**: More verification for higher-value actions
2. **Contextual Challenges**: Security checks that make sense for the specific action
3. **Guided Verification**: Clear instructions for completing security steps
4. **Sensible Defaults**: Safe assumptions that work for most users

This approach ensures that:

- Casual users can get started easily
- Legitimate creators receive proper attribution
- Bad actors face significant barriers to abuse
- The system remains intuitive despite the security layers

## 🛠️ Technical Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│   X (Twitter)   │────▶│  Worker Agent   │────▶│  NEAR Contract  │
│                 │     │     (TEE)       │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        │                       │                       │
        ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│   Bankrbot      │     │   GitHub API    │     │  Chain Signatures│
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## 🧩 Core Components

### 1. X Integration

- Monitors X for mentions and commands
- Parses user commands and validates inputs
- Provides feedback and status updates to users

### 2. GitHub Integration

- Fetches repository contribution data
- Analyzes contribution patterns
- Calculates fair distribution percentages

### 3. Smart Contract

- Manages repository split configurations
- Handles fund distribution logic
- Verifies GitHub identities
- Uses chain signatures for cross-chain transactions

### 4. Web Dashboard

- Displays all agent activity
- Shows split configurations and distribution history
- Provides detailed analytics on repository contributions

## 📝 Implementation Plan

Our implementation follows a phased approach to deliver a secure, user-friendly system:

### Phase 1: Core Identity System ✅

- Implement tiered verification approach for GitHub-X linking
- Build repository verification flow
- Create secure identity storage in smart contract

### Phase 2: Smart Repository Matching ✅

- Develop fuzzy matching for repository names
- Implement context awareness for recent interactions
- Build fallback mechanisms for ambiguous cases

### Phase 3: Secure Split Creation ✅

- Verify repository relationships and ownership
- Implement contribution analysis algorithms
- Create transparent on-chain records

### Phase 4: Safe Distribution Mechanism ✅

- Implement verification level requirements based on amount
- Create notification and claim system
- Build dispute resolution process

### Phase 5: Incentive & Bounty System 🔄

- Implement task-based bounties
- Create verification system for task completion
- Build automatic distribution for completed tasks

## 🚀 Getting Started

### Prerequisites

- Node.js >= 16.0.0
- Rust and cargo-near
- Docker for TEE deployment

### Local Development

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/gitsplits-x-agent
   cd gitsplits-x-agent
   ```

2. Install dependencies:

   ```bash
   yarn
   ```

3. Set up environment variables:

   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. Run the development server:
   ```bash
   yarn dev
   ```

### Deploying the Smart Contract

1. Build the contract:

   ```bash
   cd contracts/near
   cargo near build
   ```

2. Deploy to NEAR:
   ```bash
   near create-account gitsplits.YOUR_ACCOUNT_ID.near --masterAccount YOUR_ACCOUNT_ID.near --initialBalance 5
   near deploy gitsplits.YOUR_ACCOUNT_ID.near target/near/gitsplits_x_agent.wasm
   near call gitsplits.YOUR_ACCOUNT_ID.near new '{}' --accountId YOUR_ACCOUNT_ID.near
   ```

> **Note**: The contract is currently deployed on NEAR testnet at `gitsplits-test.testnet`. See [CONTRACT_DETAILS.md](contracts/near/CONTRACT_DETAILS.md) for more information.

### Deploying the Worker Agent

1. Build the Docker image:

   ```bash
   yarn docker:build
   yarn docker:push
   ```

2. Deploy to Phala Cloud following the instructions in the [Deployment Guide](docs/deployment.md).

## 🔐 Wallet Integration

GitSplits supports two wallet systems for different blockchain ecosystems:

### EVM Wallet (Ethereum, Arbitrum, etc.)

The EVM wallet integration uses AppKit/Wagmi for connecting to Ethereum-based chains:

```bash
# Install dependencies
npm install @reown/appkit/react wagmi
```

### NEAR Wallet (Bitte Wallet)

For NEAR blockchain operations, GitSplits uses Bitte Wallet:

```bash
# Install dependencies
npm install @bitte-ai/react @near-wallet-selector/modal-ui
```

To set up Bitte Wallet in your application:

1. Create a Bitte Wallet Provider component:

```tsx
// src/components/near/BitteWalletProvider.tsx
import React from "react";
import "@near-wallet-selector/modal-ui/styles.css";
import { BitteWalletContextProvider } from "@bitte-ai/react";

const BitteWalletProvider = ({ children }) => {
  return (
    <BitteWalletContextProvider network="testnet">
      {children}
    </BitteWalletContextProvider>
  );
};

export default BitteWalletProvider;
```

2. Wrap your application with the provider:

```tsx
// In your layout or app component
<BitteWalletProvider>{children}</BitteWalletProvider>
```

3. Use the wallet in your components:

```tsx
import { useBitteWallet } from "@bitte-ai/react";

function MyComponent() {
  const { selector, modal, accounts, accountId } = useBitteWallet();

  const handleConnect = () => {
    modal.show();
  };

  return (
    <div>
      {accountId ? (
        <p>Connected as: {accountId}</p>
      ) : (
        <button onClick={handleConnect}>Connect NEAR Wallet</button>
      )}
    </div>
  );
}
```

## 📚 Documentation

- [Architecture Overview](docs/architecture.md)
- [Smart Contract API](docs/contract-api.md)
- [Worker Agent API](docs/worker-api.md)
- [X Command Reference](docs/x-commands.md)
- [Deployment Guide](docs/deployment.md)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgements

- [NEAR Protocol](https://near.org) for the Shade Agents infrastructure
- [Bankrbot](https://x.com/bankrbot) for the X integration
- [Phala Network](https://phala.network) for the TEE infrastructure
- [GitHub API](https://docs.github.com/en/rest) for repository data
