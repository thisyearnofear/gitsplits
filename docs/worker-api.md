# Worker Agent API

The GitSplits X Agent Worker Agent runs in a Trusted Execution Environment (TEE) and provides the following API endpoints:

## Public API Endpoints

### `POST /api/register`

Registers the worker agent with the NEAR smart contract by generating a remote attestation quote and sending it to the contract.

**Request:**
```json
{}
```

**Response:**
```json
{
  "success": true,
  "worker_id": "worker-123456",
  "attestation_id": "att-789012"
}
```

### `POST /api/commands`

Processes X commands received via webhooks.

**Request:**
```json
{
  "command": "create",
  "repo_url": "github.com/user/repo",
  "sender": "user123",
  "tweet_id": "1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "command_id": "cmd-123456",
  "status": "processing"
}
```

### `GET /api/splits/:splitId`

Retrieves information about a specific split.

**Response:**
```json
{
  "id": "split-123456",
  "repo_url": "github.com/user/repo",
  "owner": "user.near",
  "contributors": [
    {
      "github_username": "contributor1",
      "account_id": "contributor1.near",
      "percentage": "60.00"
    },
    {
      "github_username": "contributor2",
      "account_id": "contributor2.near",
      "percentage": "40.00"
    }
  ],
  "created_at": 1682345678,
  "updated_at": 1682345678
}
```

### `GET /api/distributions/:splitId`

Retrieves distribution history for a specific split.

**Response:**
```json
{
  "distributions": [
    {
      "id": "dist-123456",
      "split_id": "split-123456",
      "amount": "100.00",
      "token_id": "NEAR",
      "timestamp": 1682345678,
      "transactions": [
        {
          "chain_id": "near",
          "recipient": "contributor1.near",
          "amount": "60.00",
          "tx_hash": "Abc123Def456",
          "status": "completed"
        },
        {
          "chain_id": "near",
          "recipient": "contributor2.near",
          "amount": "40.00",
          "tx_hash": "Ghi789Jkl012",
          "status": "completed"
        }
      ]
    }
  ]
}
```

### `GET /api/github/verify/:username`

Initiates GitHub identity verification for a username.

**Response:**
```json
{
  "success": true,
  "verification_id": "ver-123456",
  "verification_url": "https://gitsplits.example.com/verify/ver-123456"
}
```

## Internal API Endpoints

### `POST /internal/github/fetch-repo`

Fetches repository data from GitHub API.

**Request:**
```json
{
  "repo_url": "github.com/user/repo"
}
```

**Response:**
```json
{
  "success": true,
  "repo_data": {
    "name": "repo",
    "owner": "user",
    "contributors": [
      {
        "login": "contributor1",
        "contributions": 120,
        "avatar_url": "https://github.com/avatar1.png"
      },
      {
        "login": "contributor2",
        "contributions": 80,
        "avatar_url": "https://github.com/avatar2.png"
      }
    ]
  }
}
```

### `POST /internal/near/call-contract`

Calls a method on the NEAR smart contract.

**Request:**
```json
{
  "method": "create_split",
  "args": {
    "repo_url": "github.com/user/repo",
    "owner": "user.near"
  }
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "split_id": "split-123456"
  }
}
```

### `POST /internal/chain-signatures/generate`

Generates a chain signature for a cross-chain transaction.

**Request:**
```json
{
  "chain_id": "ethereum",
  "tx_data": {
    "to": "0x1234567890abcdef",
    "value": "1000000000000000000",
    "data": "0x"
  }
}
```

**Response:**
```json
{
  "success": true,
  "signature": {
    "signature": "0xabcdef1234567890",
    "public_key": "0x0987654321fedcba",
    "chain_id": "ethereum"
  }
}
```

### `POST /internal/x/reply`

Sends a reply to a tweet on X.

**Request:**
```json
{
  "tweet_id": "1234567890",
  "message": "Split created successfully! View details at https://gitsplits.example.com/splits/split-123456"
}
```

**Response:**
```json
{
  "success": true,
  "reply_id": "9876543210"
}
```

## WebSocket API

### `ws://worker-endpoint/ws/commands`

Real-time updates for command processing.

**Events:**

- `command_received`: Triggered when a new command is received
- `command_processing`: Triggered when command processing begins
- `command_completed`: Triggered when command processing completes
- `command_failed`: Triggered when command processing fails

**Example Event:**
```json
{
  "event": "command_completed",
  "data": {
    "command_id": "cmd-123456",
    "command": "create",
    "repo_url": "github.com/user/repo",
    "result": {
      "split_id": "split-123456"
    }
  }
}
```

## Error Handling

All API endpoints return standard error responses:

```json
{
  "success": false,
  "error": {
    "code": "invalid_input",
    "message": "Repository URL is invalid"
  }
}
```

Common error codes:
- `invalid_input`: Input validation failed
- `not_found`: Requested resource not found
- `unauthorized`: Authentication required
- `forbidden`: Permission denied
- `internal_error`: Internal server error
- `github_api_error`: Error from GitHub API
- `contract_error`: Error from NEAR contract
- `x_api_error`: Error from X API
