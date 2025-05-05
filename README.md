# GitSplits X Agent

## 🏆 Bankrbot Extension Hackathon Submission

GitSplits is an autonomous agent built on the NEAR Shade Agents stack that enables GitHub repository contributors to receive fair compensation based on their contributions. Users interact with the agent entirely through X (Twitter), making it easy to create and manage revenue splits for any GitHub repository.

## 🎬 Demo Scenarios

### Scenario 1: Analyzing Repository Contributions

```
@gitsplits github.com/torvalds/linux
```

GitSplits analyzes the repository and responds with suggested splits based on contribution history, ensuring original creators are recognized. The user can then decide to create a split with default percentages or specify custom allocations.

### Scenario 2: Creating a Split

```
@gitsplits create split github.com/torvalds/linux default

or

@gitsplits create split github.com/torvalds/linux 80/10/10
```

GitSplits creates a smart contract split based on either the default contribution percentages or the user-specified allocation. It then provides the contract address for fund distribution.

### Scenario 3: Distributing Funds

```
@bankrbot send 1ETH to [splits contract address]
```

After a split is created, users can send funds to the contract address via Bankrbot. The funds are allocated to contributors based on the split percentages. Contributors must verify their identity to claim their portion.

### Scenario 4: Viewing Active Splits

```
@gitsplits splits github.com/near/near-sdk-rs
```

GitSplits shows active splits for the specified repository, including contract addresses and allocation percentages.

## 🚀 Features

- **X-Native Interaction**: Interact with GitSplits directly through X using simple commands
- **Farcaster Integration**: Interact with GitSplits through Farcaster mentions
- **Contribution Analysis**: Analyze GitHub repositories to determine contribution splits based on commit history
- **Smart Contract Splits**: Create permanent splits for repositories with customizable allocations
- **Multi-Chain Integration**: Distribute funds across blockchains to contributors via Bankrbot
- **Identity Verification**: Link GitHub identities to blockchain accounts (via web interface)
- **Transparent Split Management**: Create, view, and update splits with full transparency

## 🤖 How It Works

GitSplits combines the power of NEAR blockchain with GitHub integration to create a seamless experience:

1. **Repository Analysis**: When requested via X, GitSplits analyzes a GitHub repository and determines the contribution percentages of each contributor.

2. **Split Creation**: Users can create a split for a repository with default percentages or custom allocations, which stores the contributor information in a smart contract.

3. **Fund Distribution**: After a split is created, users can send funds to the contract address via Bankrbot. The funds are allocated to contributors based on the split percentages.

4. **Identity Verification**: Contributors verify their GitHub identity through a secure web interface and link it to their blockchain accounts.

5. **Fund Claiming**: Verified contributors can claim their portion of the funds from the contract.

## 📋 Social Commands

### X Commands

| Command                            | Description                         | Example                                            |
| ---------------------------------- | ----------------------------------- | -------------------------------------------------- |
| `<repo>`                           | Analyze repository contributions    | `@gitsplits github.com/near/near-sdk-rs`           |
| `create split <repo> [allocation]` | Create a split for a repository     | `@gitsplits create split near/near-sdk-rs default` |
| `splits <repo>`                    | View active splits for a repository | `@gitsplits splits near/near-sdk-rs`               |
| `help`                             | Show help message                   | `@gitsplits help`                                  |

### Farcaster Commands

The same commands are available on Farcaster:

| Command                            | Description                         | Example                                            |
| ---------------------------------- | ----------------------------------- | -------------------------------------------------- |
| `<repo>`                           | Analyze repository contributions    | `@gitsplits github.com/near/near-sdk-rs`           |
| `create split <repo> [allocation]` | Create a split for a repository     | `@gitsplits create split near/near-sdk-rs default` |
| `splits <repo>`                    | View active splits for a repository | `@gitsplits splits near/near-sdk-rs`               |
| `help`                             | Show help message                   | `@gitsplits help`                                  |

> **Note**: You can use repository names (e.g., `near/near-sdk-rs`) or full URLs (e.g., `github.com/near/near-sdk-rs`)

## 🔒 Smart Contract Splits

The smart contract split system:

1. **Stores contributor information**: Each split contains the GitHub usernames and allocation percentages of contributors.
2. **Receives funds**: Users can send funds to the contract address via Bankrbot.
3. **Allocates funds**: Funds are allocated to contributors based on the split percentages.
4. **Verifies identities**: Contributors must verify their GitHub identity to claim their portion.
5. **Permanent splits**: Once a split is created, it is permanent and funds sent to it will always be distributed according to the defined percentages.

## 🛠️ Architecture

GitSplits is built on the NEAR blockchain, ensuring security and transparency:

### 1. Worker Agent

- Processes X commands and GitHub API requests
- Analyzes GitHub repositories to determine contribution percentages
- Interacts with the NEAR smart contract

### 2. NEAR Smart Contract

- Manages repository split configurations
- Handles fund allocation based on split percentages
- Verifies GitHub identities
- Allows contributors to claim their portion

### 3. Identity Verification

- Web interface for linking GitHub and Twitter identities to blockchain accounts
- Multiple verification options:
  - GitHub OAuth for one-click verification (recommended)
  - GitHub Gist verification as an alternative
  - Twitter verification via tweet URL
- Uses Firebase for secure storage of verification data
- Cryptographically verifies ownership of GitHub and Twitter accounts

## 🧪 Development

### Prerequisites

- Node.js 18+
- Rust and Cargo
- NEAR CLI
- Docker and Docker Compose
- Firebase account (for identity verification)
- GitHub API token (for repository analysis and verification)
- Twitter account (for X integration)

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   cd worker && npm install
   ```
3. Create a `.env.local` file based on `.env.example`
4. Set up Firebase:
   - Create a new Firebase project at [firebase.google.com](https://firebase.google.com)
   - Enable Firestore database
   - Create a web app and copy the configuration to your `.env.local` file
5. Set up GitHub OAuth (for one-click verification):
   - Create a new OAuth app at [github.com/settings/developers](https://github.com/settings/developers)
   - Set the Authorization callback URL to `http://localhost:3000/api/auth/github/callback` (make sure this matches your Next.js API route)
   - Copy the Client ID and Client Secret to your `.env.local` file
6. Set up Twitter authentication:
   - See [docs/twitter/TWITTER_AUTH_GUIDE.md](docs/twitter/TWITTER_AUTH_GUIDE.md) for detailed instructions
   - Use the `scripts/get-twitter-cookies.sh` script to extract Twitter cookies from your browser
7. Set up Farcaster integration (optional):
   - Create a Neynar account at [dev.neynar.com](https://dev.neynar.com)
   - Create a Farcaster bot using the `scripts/farcaster/create-farcaster-bot.js` script
   - Register a webhook using the `scripts/farcaster/register-webhook.js` script
   - See [docs/farcaster/FARCASTER_INTEGRATION.md](docs/farcaster/FARCASTER_INTEGRATION.md) for detailed instructions
8. Build the smart contract:
   ```bash
   cd contracts/near && cargo build
   ```
9. Start the worker agent:
   ```bash
   ./scripts/run-mock-worker.sh  # For testing with mock Twitter data
   # or
   cd worker && npm run dev      # For real Twitter integration
   ```
10. Start the Farcaster bot (optional):
    ```bash
    ./scripts/run-farcaster-bot.sh
    ```
11. Start the frontend:
    ```bash
    npm run dev
    ```

### Testing

Run the tests for the worker agent:

```bash
cd worker && npm run test:local
```

Run the tests for the smart contract:

```bash
cd contracts/near && cargo test
```

Run the Twitter integration tests:

```bash
# Test Twitter authentication
./scripts/test-twitter-auth.sh

# Test Twitter API endpoints
./scripts/test-twitter-endpoints.sh

# Run specific Twitter tests
node scripts/twitter-tests/test-user-info.js
```

Run the Farcaster integration tests:

```bash
# Create a Farcaster bot
node scripts/farcaster/create-farcaster-bot.js

# Register a webhook
node scripts/farcaster/register-webhook.js

# Start the webhook server
node scripts/farcaster/webhook-server.js
```

### Project Structure

- `contracts/`: Smart contract code
- `docs/`: Documentation
  - `twitter/`: Twitter integration documentation
  - `farcaster/`: Farcaster integration documentation
- `scripts/`: Helper scripts
  - `twitter-tests/`: Twitter test scripts
  - `farcaster/`: Farcaster integration scripts
- `src/`: Frontend code
- `worker/`: Worker agent code

### Deployment

See [PRIVATE_DEPLOYMENT_DETAILS.md](PRIVATE_DEPLOYMENT_DETAILS.md) for deployment instructions.

## ⚠️ Current Limitations

- Currently only supports ETH and NEAR tokens for fund distribution
- GitHub identity verification requires a separate web interface
- Limited to public GitHub repositories
- Maximum of 100 contributors per repository

## 🔮 Future Enhancements

- Support for more tokens and chains
- Streamlined GitHub identity verification
- Support for private repositories
- Integration with more development platforms
- Split expiration and fund management options
