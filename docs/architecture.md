# GitSplits X Agent Architecture

## System Overview

GitSplits X Agent is built on the NEAR Shade Agents stack, enabling secure, autonomous operations for managing GitHub repository contribution splits and fund distribution. The system consists of several key components working together to provide a seamless experience for users interacting via X (Twitter).

## Architecture Components

### 1. X Interface Layer

Users interact with GitSplits X Agent through X by mentioning `@bankrbot @gitsplits` with specific commands. This layer:

- Monitors X for mentions and commands
- Parses and validates user inputs
- Provides feedback and status updates to users

### 2. Worker Agent (TEE-Secured)

The Worker Agent runs in a Trusted Execution Environment (TEE) on NEAR AI Hub, ensuring secure and verifiable execution. It:

- Processes X commands received via webhooks
- Interacts with the GitHub API to fetch repository data
- Calculates contribution percentages based on repository activity
- Generates and signs transactions using ephemeral keys
- Communicates with the NEAR smart contract

### 3. NEAR Smart Contract

The smart contract serves as the on-chain component of the system, providing:

- Worker agent verification through remote attestation
- Repository split configuration management
- Fund distribution logic
- GitHub identity verification
- Chain signature generation for cross-chain transactions

### 4. Multi-Chain Integration

GitSplits leverages NEAR's chain signatures to enable cross-chain transactions:

- Generates signatures for transactions on Ethereum, Solana, and other chains
- Ensures secure and verifiable transactions across blockchains
- Enables fund distribution to contributors on their preferred chains

### 5. Web Dashboard

The web dashboard provides a visual interface for monitoring agent activity:

- Displays all agent actions and transactions
- Shows split configurations and distribution history
- Provides detailed analytics on repository contributions
- Serves as a verification tool for X-based interactions

## Data Flow

1. **Command Initiation**:
   - User posts a command on X mentioning `@bankrbot @gitsplits`
   - X webhook notifies the Worker Agent of the mention

2. **Command Processing**:
   - Worker Agent parses the command and validates inputs
   - For repository-related commands, the agent fetches data from GitHub API
   - Agent calculates contribution percentages and prepares transaction data

3. **On-Chain Verification**:
   - Worker Agent communicates with the NEAR smart contract
   - Smart contract verifies the Worker Agent's attestation
   - Contract processes the command and updates on-chain state

4. **Transaction Execution**:
   - For fund distribution, the contract generates chain signatures
   - Transactions are executed on target blockchains
   - Results are recorded on-chain and reported back to the user on X

5. **Dashboard Updates**:
   - All actions and transactions are logged and displayed on the web dashboard
   - Users can verify the status and history of their commands

## Security Considerations

1. **TEE Security**:
   - Worker Agent code is verified through remote attestation
   - Ephemeral keys are generated within the TEE and never exposed
   - All sensitive operations occur within the secure enclave

2. **Smart Contract Security**:
   - Method access control ensures only verified Worker Agents can call sensitive methods
   - Transaction verification prevents unauthorized fund distribution
   - Time-delayed operations for high-value transactions

3. **X Command Security**:
   - Command validation prevents malicious inputs
   - User verification ensures only authorized users can perform certain actions
   - Rate limiting prevents abuse

## Scalability Considerations

1. **Worker Agent Scaling**:
   - Multiple Worker Agents can be deployed to handle increased load
   - Stateless design allows for horizontal scaling
   - Load balancing across multiple TEE instances

2. **Smart Contract Optimization**:
   - Efficient storage patterns to minimize gas costs
   - Batched operations for handling multiple repositories
   - Optimized fund distribution logic

3. **Cross-Chain Efficiency**:
   - Batched transactions for multi-recipient distributions
   - Gas optimization for cross-chain operations
   - Fallback mechanisms for failed transactions
