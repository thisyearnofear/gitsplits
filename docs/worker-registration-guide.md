# Worker Agent Registration Guide

This guide explains how to register the GitSplits Worker Agent with the NEAR contract.

## Overview

The GitSplits Worker Agent needs to be registered with the NEAR contract to be able to call restricted methods. This registration process involves generating a remote attestation quote from the TEE and sending it to the contract for verification.

## Prerequisites

1. The NEAR contract is deployed and initialized
2. The Worker Agent is deployed to Phala Cloud
3. You have access to the Worker Agent's logs and endpoints

## Step 1: Understand the Registration Process

When the Worker Agent runs in a TEE (Trusted Execution Environment), it generates a remote attestation quote that proves:

1. The code is running in a genuine TEE
2. The code has not been tampered with
3. The code hash matches the expected value

This quote is then sent to the NEAR contract, which verifies it and registers the Worker Agent.

## Step 2: Trigger Registration

There are two ways to trigger the registration process:

### Option 1: Automatic Registration

The Worker Agent will attempt to register itself automatically when it starts up. You can check the logs to see if this was successful:

```
Generating remote attestation quote...
Remote attestation quote generated successfully
Registering worker with NEAR contract...
Worker registered successfully with NEAR contract
```

### Option 2: Manual Registration

If automatic registration fails, you can manually trigger it by calling the registration endpoint:

```bash
curl -X POST http://your-worker-agent-url:3001/api/register
```

Replace `your-worker-agent-url` with the URL of your Worker Agent.

## Step 3: Verify Registration

To verify that the Worker Agent is registered with the NEAR contract, you can call the `is_worker_registered` method:

```bash
near view your-contract-id.testnet is_worker_registered '{"account_id": "your-worker-account-id.testnet"}'
```

Replace:
- `your-contract-id.testnet` with your NEAR contract ID
- `your-worker-account-id.testnet` with the account ID of your Worker Agent

If the Worker Agent is registered, this command will return `true`.

## Step 4: Troubleshooting

If registration fails, check the following:

### Contract Issues

1. Make sure the contract is deployed and initialized correctly
2. Check that the contract has the `register_worker` method
3. Verify that the contract is using the correct attestation verification logic

### Worker Agent Issues

1. Check that the Worker Agent is running in a TEE
2. Verify that the Worker Agent has the correct contract ID and account ID
3. Check the Worker Agent logs for any error messages

### TEE Issues

1. Make sure the TEE is properly configured
2. Check that the TEE supports remote attestation
3. Verify that the TEE is using the correct attestation protocol

## Step 5: Re-Registration

If you need to re-register the Worker Agent (e.g., after updating the code), you can:

1. Stop the Worker Agent
2. Update the code
3. Rebuild and redeploy the Docker image
4. Start the Worker Agent
5. Trigger registration again

The NEAR contract will update the Worker Agent's registration with the new code hash.
