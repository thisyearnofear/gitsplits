const nearAPI = require("near-api-js");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

// Load environment variables from .env
dotenv.config();

const { connect, KeyPair, keyStores } = nearAPI;

async function deploy() {
  const networkId = "mainnet";
  const accountId = process.env.NEAR_ACCOUNT_ID || "lhkor_marty.near";
  const privateKey = process.env.NEAR_PRIVATE_KEY;
  const wasmPath = path.join(__dirname, "../../contracts/near/target/wasm32-unknown-unknown/release/gitsplits_x_agent.wasm");

  if (!privateKey) {
    console.error("NEAR_PRIVATE_KEY not found in .env");
    process.exit(1);
  }

  if (!fs.existsSync(wasmPath)) {
    console.error(`WASM file not found at ${wasmPath}. Run 'cargo build' in contracts/near first.`);
    process.exit(1);
  }

  console.log(`Deploying ${wasmPath} to ${accountId} on ${networkId}...`);

  const keyStore = new keyStores.InMemoryKeyStore();
  await keyStore.setKey(networkId, accountId, KeyPair.fromString(privateKey));

  const config = {
    networkId,
    keyStore,
    nodeUrl: `https://rpc.${networkId}.near.org`,
    walletUrl: `https://wallet.${networkId}.near.org`,
    helperUrl: `https://helper.${networkId}.near.org`,
    explorerUrl: `https://explorer.${networkId}.near.org`,
  };

  const near = await connect(config);
  const account = await near.account(accountId);

  try {
    const wasm = fs.readFileSync(wasmPath);
    const result = await account.deployContract(wasm);
    console.log("Contract deployed successfully!");
    console.log("Transaction Hash:", result.transaction_outcome.id);
    console.log("Explorer Link:", `${config.explorerUrl}/transactions/${result.transaction_outcome.id}`);

    // Initialize the contract if needed
    console.log("Attempting to initialize the contract...");
    try {
        await account.functionCall({
            contractId: accountId,
            methodName: "new",
            args: {},
            gas: "30000000000000" // 30 TGas
        });
        console.log("Contract initialized successfully!");
    } catch (initError) {
        if (initError.message.includes("Already initialized")) {
            console.log("Contract was already initialized.");
        } else {
            console.error("Error during initialization:", initError.message);
        }
    }

  } catch (error) {
    console.error("Error deploying contract:", error.message);
    process.exit(1);
  }
}

deploy();
