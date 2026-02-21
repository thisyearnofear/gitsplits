// Test script for NEAR contract interaction
const { connect, keyStores, KeyPair, Contract } = require("near-api-js");
const dotenv = require("dotenv");
const path = require("path");

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, "../../.env.local") });

// NEAR configuration
const nearConfig = {
  networkId: process.env.NEAR_NETWORK_ID || "mainnet",
  nodeUrl: process.env.NEAR_NODE_URL || "https://rpc.mainnet.near.org",
  contractName: process.env.NEAR_CONTRACT_ID || "gitsplits-worker.papajams.near",
  walletUrl: process.env.NEAR_WALLET_URL || "https://wallet.mainnet.near.org",
  helperUrl: process.env.NEAR_HELPER_URL || "https://helper.mainnet.near.org",
};

/**
 * Initialize NEAR connection and contract
 */
async function initializeNear() {
  try {
    console.log("Initializing NEAR connection...");
    
    // Initialize key store
    const keyStore = new keyStores.InMemoryKeyStore();
    
    // Load private key from environment variable
    if (process.env.NEAR_PRIVATE_KEY) {
      const keyPair = KeyPair.fromString(process.env.NEAR_PRIVATE_KEY);
      await keyStore.setKey(
        nearConfig.networkId,
        process.env.NEAR_ACCOUNT_ID,
        keyPair
      );
      console.log(`Added key for account: ${process.env.NEAR_ACCOUNT_ID}`);
    } else {
      throw new Error("NEAR_PRIVATE_KEY is not defined in environment variables");
    }
    
    // Connect to NEAR
    const nearConnection = await connect({
      deps: { keyStore },
      ...nearConfig,
    });
    
    // Get account object
    const account = await nearConnection.account(process.env.NEAR_ACCOUNT_ID);
    console.log(`Connected to account: ${account.accountId}`);
    
    // Initialize contract
    const contract = new Contract(account, nearConfig.contractName, {
      viewMethods: [
        "is_worker_registered",
        "get_split",
        "get_split_by_repo",
      ],
      changeMethods: [
        "register_worker",
        "create_split",
        "update_split",
        "generate_chain_signature",
      ],
    });
    
    console.log("NEAR connection initialized successfully");
    return { nearConnection, account, contract };
  } catch (error) {
    console.error("Error initializing NEAR connection:", error);
    throw error;
  }
}

/**
 * Test worker registration
 */
async function testWorkerRegistration(contract) {
  try {
    console.log("\n--- Testing Worker Registration ---");
    
    // Check if worker is already registered
    const isRegistered = await contract.is_worker_registered({
      account_id: process.env.NEAR_ACCOUNT_ID,
    });
    
    console.log(`Worker registered: ${isRegistered}`);
    
    if (!isRegistered) {
      console.log("Registering worker...");
      
      // In a real TEE implementation, this would generate a real attestation quote
      const attestation = {
        quote: "placeholder-quote",
        endorsements: "placeholder-endorsements",
      };
      
      // Register the worker
      const result = await contract.register_worker({
        _attestation: attestation,
        code_hash: "placeholder-code-hash",
      });
      
      console.log(`Worker registration result: ${result}`);
    }
    
    return true;
  } catch (error) {
    console.error("Error testing worker registration:", error);
    console.log("Error details:", error.message);
    return false;
  }
}

/**
 * Test split creation
 */
async function testSplitCreation(contract) {
  try {
    console.log("\n--- Testing Split Creation ---");
    
    const repoUrl = "github.com/test/repo";
    
    // Check if split already exists
    const existingSplit = await contract.get_split_by_repo({
      repo_url: repoUrl,
    });
    
    if (existingSplit) {
      console.log(`Split already exists for ${repoUrl}:`, existingSplit);
      return true;
    }
    
    console.log(`Creating split for ${repoUrl}...`);
    
    // Create split
    const splitId = await contract.create_split({
      repo_url: repoUrl,
      owner: process.env.NEAR_ACCOUNT_ID,
    });
    
    console.log(`Split created with ID: ${splitId}`);
    
    // Define test contributors
    const contributors = [
      {
        github_username: "test-user-1",
        account_id: null,
        percentage: "70000000000000000000000", // 70%
      },
      {
        github_username: "test-user-2",
        account_id: null,
        percentage: "30000000000000000000000", // 30%
      },
    ];
    
    console.log("Updating split with contributors...");
    
    // Update split with contributors
    const updateResult = await contract.update_split({
      split_id: splitId,
      contributors,
    });
    
    console.log(`Split update result: ${updateResult}`);
    
    // Get split details
    const split = await contract.get_split({
      split_id: splitId,
    });
    
    console.log("Split details:", split);
    
    return true;
  } catch (error) {
    console.error("Error testing split creation:", error);
    console.log("Error details:", error.message);
    return false;
  }
}

/**
 * Run all tests
 */
async function runTests() {
  try {
    const { contract } = await initializeNear();
    
    // Test worker registration
    const registrationResult = await testWorkerRegistration(contract);
    
    if (registrationResult) {
      // Test split creation
      await testSplitCreation(contract);
    }
    
    console.log("\nAll tests completed");
  } catch (error) {
    console.error("Error running tests:", error);
  }
}

// Run the tests
runTests();
