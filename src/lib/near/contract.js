import { connect, keyStores, Contract } from 'near-api-js';

// Configuration for connecting to NEAR
const config = {
  networkId: 'testnet',
  nodeUrl: 'https://rpc.testnet.near.org',
  contractName: 'gitsplits-test.testnet',
  walletUrl: 'https://wallet.testnet.near.org',
  helperUrl: 'https://helper.testnet.near.org',
  explorerUrl: 'https://explorer.testnet.near.org',
};

// Methods that change state (require gas)
const changeMethods = [
  'register_worker',
  'create_split',
  'update_split',
  'generate_chain_signature',
];

// Methods that only view state (no gas needed)
const viewMethods = [
  'is_worker_registered',
  'get_split',
  'get_split_by_repo',
];

/**
 * Initialize the NEAR connection and contract
 * @returns {Promise<{near: Near, contract: Contract, walletConnection: WalletConnection}>}
 */
export async function initNear() {
  // Create a key store for browser local storage
  const keyStore = new keyStores.BrowserLocalStorageKeyStore();

  // Initialize connection to the NEAR network
  const near = await connect({
    deps: {
      keyStore,
    },
    ...config,
  });

  // Initialize wallet connection
  const walletConnection = await new near.WalletConnection(near, 'gitsplits');

  // Initialize contract API
  const contract = new Contract(
    walletConnection.account(),
    config.contractName,
    {
      viewMethods,
      changeMethods,
    }
  );

  return { near, contract, walletConnection };
}

/**
 * Class to interact with the GitSplits NEAR contract
 */
export class GitSplitsContract {
  constructor() {
    this.near = null;
    this.contract = null;
    this.walletConnection = null;
    this.initialized = false;
  }

  /**
   * Initialize the contract connection
   * @returns {Promise<void>}
   */
  async init() {
    if (this.initialized) return;
    
    const { near, contract, walletConnection } = await initNear();
    this.near = near;
    this.contract = contract;
    this.walletConnection = walletConnection;
    this.initialized = true;
  }

  /**
   * Check if user is signed in
   * @returns {boolean}
   */
  isSignedIn() {
    return this.walletConnection && this.walletConnection.isSignedIn();
  }

  /**
   * Sign in with NEAR wallet
   * @returns {Promise<void>}
   */
  signIn() {
    if (!this.walletConnection) throw new Error('Wallet connection not initialized');
    return this.walletConnection.requestSignIn({
      contractId: config.contractName,
      methodNames: changeMethods,
    });
  }

  /**
   * Sign out from NEAR wallet
   * @returns {void}
   */
  signOut() {
    if (!this.walletConnection) throw new Error('Wallet connection not initialized');
    this.walletConnection.signOut();
  }

  /**
   * Get the account ID of the signed-in user
   * @returns {string|null}
   */
  getAccountId() {
    if (!this.isSignedIn()) return null;
    return this.walletConnection.getAccountId();
  }

  /**
   * Check if an account is a registered worker
   * @param {string} accountId - The account ID to check
   * @returns {Promise<boolean>}
   */
  async isWorkerRegistered(accountId) {
    await this.ensureInitialized();
    return this.contract.is_worker_registered({ account_id: accountId });
  }

  /**
   * Register as a worker
   * @param {Object} attestation - The attestation object
   * @param {string} codeHash - The code hash
   * @returns {Promise<boolean>}
   */
  async registerWorker(attestation, codeHash) {
    await this.ensureInitialized();
    return this.contract.register_worker({ _attestation: attestation, code_hash: codeHash });
  }

  /**
   * Create a split for a repository
   * @param {string} repoUrl - The repository URL
   * @param {string} owner - The owner account ID
   * @returns {Promise<string>} - The split ID
   */
  async createSplit(repoUrl, owner) {
    await this.ensureInitialized();
    return this.contract.create_split({ repo_url: repoUrl, owner });
  }

  /**
   * Update a split with contributors
   * @param {string} splitId - The split ID
   * @param {Array} contributors - The contributors array
   * @returns {Promise<boolean>}
   */
  async updateSplit(splitId, contributors) {
    await this.ensureInitialized();
    return this.contract.update_split({ split_id: splitId, contributors });
  }

  /**
   * Get a split by ID
   * @param {string} splitId - The split ID
   * @returns {Promise<Object|null>}
   */
  async getSplit(splitId) {
    await this.ensureInitialized();
    return this.contract.get_split({ split_id: splitId });
  }

  /**
   * Get a split by repository URL
   * @param {string} repoUrl - The repository URL
   * @returns {Promise<Object|null>}
   */
  async getSplitByRepo(repoUrl) {
    await this.ensureInitialized();
    return this.contract.get_split_by_repo({ repo_url: repoUrl });
  }

  /**
   * Generate a chain signature
   * @param {string} chainId - The chain ID
   * @param {string} txData - The transaction data
   * @returns {Promise<Object>}
   */
  async generateChainSignature(chainId, txData) {
    await this.ensureInitialized();
    return this.contract.generate_chain_signature({ chain_id: chainId, _tx_data: txData });
  }

  /**
   * Ensure the contract is initialized
   * @returns {Promise<void>}
   * @private
   */
  async ensureInitialized() {
    if (!this.initialized) {
      await this.init();
    }
  }
}

// Create and export a singleton instance
export const gitSplitsContract = new GitSplitsContract();
export default gitSplitsContract;
