# GitHub Split Contract Implementation Plan

## Overview

A smart contract system that splits ETH payments between Linus Torvalds and 0xSplits, with secure GitHub identity verification before wallet connection.

## Core Components

### 1. Frontend Authentication

- GitHub OAuth flow implementation
- User signs in with GitHub
- Frontend verifies user is either "torvalds" or "0xSplits"
- After verification, user connects their Ethereum wallet
- Frontend calls Chainlink oracle to verify GitHub identity on-chain

### 2. Oracle Implementation

Using Chainlink's External Adapter:

- Custom external adapter that verifies GitHub OAuth tokens
- Chainlink node calls the adapter and returns verification to contract
- Estimated cost: ~0.1 LINK per verification
- Chainlink job spec needs to verify:
  - GitHub username ownership
  - Account age > 1 year
  - Minimum activity threshold

### 3. Smart Contract Architecture

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/ChainlinkClient.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract GitHubSplit is ChainlinkClient, ReentrancyGuard, Pausable {
    using Chainlink for Chainlink.Request;

    struct Verification {
        bool isVerified;
        uint256 verificationTime;
        address walletAddress;
    }

    mapping(string => Verification) public verifiedUsers;
    uint256 public constant VERIFICATION_DELAY = 7 days;
    uint256 public constant TOTAL_SHARES = 2;
    bytes32 private immutable jobId;
    uint256 private immutable fee;

    event VerificationRequested(string githubUsername, address wallet);
    event VerificationCompleted(string githubUsername, address wallet);
    event PaymentReleased(address to, uint256 amount);

    constructor(address _link, address _oracle, bytes32 _jobId) {
        setChainlinkToken(_link);
        setChainlinkOracle(_oracle);
        jobId = _jobId;
        fee = (1 * LINK_DIVISIBILITY) / 10; // 0.1 LINK
    }

    function requestVerification(string calldata githubUsername) external {
        require(
            keccak256(bytes(githubUsername)) == keccak256(bytes("torvalds")) ||
            keccak256(bytes(githubUsername)) == keccak256(bytes("0xSplits")),
            "Invalid username"
        );
        require(!verifiedUsers[githubUsername].isVerified, "Already verified");

        Chainlink.Request memory req = buildChainlinkRequest(
            jobId,
            address(this),
            this.fulfill.selector
        );
        req.add("username", githubUsername);
        req.add("wallet", Strings.toHexString(msg.sender));
        sendChainlinkRequest(req, fee);

        emit VerificationRequested(githubUsername, msg.sender);
    }

    function fulfill(bytes32 _requestId, bool _isValid, string memory username, address wallet)
        public
        recordChainlinkFulfillment(_requestId)
    {
        if (_isValid) {
            verifiedUsers[username] = Verification({
                isVerified: true,
                verificationTime: block.timestamp,
                walletAddress: wallet
            });
            emit VerificationCompleted(username, wallet);
        }
    }

    function withdraw() external nonReentrant {
        string[2] memory validUsers = ["torvalds", "0xSplits"];
        bool isValidUser = false;

        for (uint i = 0; i < validUsers.length; i++) {
            Verification memory verification = verifiedUsers[validUsers[i]];
            if (verification.walletAddress == msg.sender) {
                require(verification.isVerified, "Not verified");
                require(
                    block.timestamp >= verification.verificationTime + VERIFICATION_DELAY,
                    "Verification delay not passed"
                );
                isValidUser = true;
                break;
            }
        }

        require(isValidUser, "Not authorized");

        uint256 share = address(this).balance / TOTAL_SHARES;
        (bool success, ) = msg.sender.call{value: share}("");
        require(success, "Transfer failed");

        emit PaymentReleased(msg.sender, share);
    }
}
```

## Security Measures

1. Time Delay

- 7-day waiting period after verification before withdrawal
- Prevents immediate withdrawals if verification is compromised
- Can be adjusted based on security needs

2. Oracle Verification Requirements

- Must be authorized GitHub account
- Account must satisfy minimum criteria
- Verification through multiple data points

3. Smart Contract Safety

- ReentrancyGuard for withdrawal function
- Pausable for emergency stops
- Limited to exactly two predefined users
- Immutable constants for critical values

## Implementation Steps

1. Development Phase

- Deploy Chainlink external adapter for GitHub verification
- Create and test frontend OAuth flow
- Deploy and verify smart contract
- Comprehensive testing of verification flow

2. Security Review

- Full audit of smart contract
- Penetration testing of frontend
- Oracle verification flow review

3. Launch Phase

- Gradual rollout with small test amounts
- Initial higher verification delay
- Monitor oracle costs and adjust as needed

## Cost Considerations

1. One-time Costs

- Smart contract deployment: ~0.1-0.2 ETH
- Oracle adapter deployment: ~$100-200
- Initial LINK token funding: ~100 LINK

2. Per-verification Costs

- Chainlink oracle fee: 0.1 LINK per verification
- Gas costs for verification: ~0.002-0.005 ETH
- Gas costs for withdrawal: ~0.001-0.003 ETH

## Technical Requirements

- Solidity ^0.8.0
- Node.js >= 16.0.0
- Chainlink node
- GitHub OAuth credentials
- Frontend: React + ethers.js
- Hardhat development environment

## Risks and Mitigations

1. Oracle Failure

- Backup verification method available
- Manual override by contract owner
- Multiple oracle providers possible

2. Frontend Security

- Server-side OAuth token validation
- Rate limiting on verification requests
- Multiple verification steps

3. Smart Contract Risks

- Limited fund exposure
- Time-delayed withdrawals
- Emergency pause functionality
