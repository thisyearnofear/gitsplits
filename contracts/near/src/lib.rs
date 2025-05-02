use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::{env, near_bindgen, AccountId, PanicOnDefault, BorshStorageKey};
use near_sdk::collections::{LookupMap, UnorderedMap, Vector};
use near_sdk::serde::{Deserialize, Serialize};
use schemars::JsonSchema;

/// Storage keys for collections
#[derive(BorshSerialize, BorshStorageKey)]
pub enum StorageKey {
    RegisteredWorkers,
    AllowedCodeHashes,
    Splits,
    SplitsByRepo,
    GithubIdentities,
    AccountGithubIdentities,
    Distributions,
    SplitDistributions,
    SplitDistributionsInner { split_id: String },
    GithubToXMappings,
    VerifiedWallets,
    PendingDistributions,
}

/// Type aliases for better readability
pub type SplitId = String;
pub type DistributionId = String;

/// Simple attestation structure
#[derive(BorshDeserialize, BorshSerialize, Clone, Debug, Serialize, Deserialize, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct Attestation {
    pub quote: String,
    pub endorsements: String,
}

/// Worker information
#[derive(BorshDeserialize, BorshSerialize, Clone, Debug, Serialize, Deserialize, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct WorkerInfo {
    pub code_hash: String,
    pub registered_at: u64,
    pub last_active_at: u64,
}

/// Contributor structure
#[derive(BorshDeserialize, BorshSerialize, Clone, Debug, Serialize, Deserialize, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct Contributor {
    pub github_username: String,
    pub account_id: Option<String>, // Using String instead of AccountId for JsonSchema
    pub percentage: u128, // Using u128 instead of U128 for JsonSchema
}

/// Split structure
#[derive(BorshDeserialize, BorshSerialize, Clone, Debug, Serialize, Deserialize, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct Split {
    pub id: SplitId,
    pub repo_url: String,
    pub owner: String, // Using String instead of AccountId for JsonSchema
    pub contributors: Vec<Contributor>,
    pub created_at: u64,
    pub updated_at: u64,
}

/// Transaction status enum
#[derive(BorshDeserialize, BorshSerialize, Clone, Debug, Serialize, Deserialize, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub enum TransactionStatus {
    Pending,
    Completed,
    Failed,
}

/// Transaction structure
#[derive(BorshDeserialize, BorshSerialize, Clone, Debug, Serialize, Deserialize, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct Transaction {
    pub chain_id: String,
    pub recipient: String,
    pub amount: String,
    pub tx_hash: Option<String>,
    pub status: TransactionStatus,
}

/// Distribution structure
#[derive(BorshDeserialize, BorshSerialize, Clone, Debug, Serialize, Deserialize, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct Distribution {
    pub id: DistributionId,
    pub split_id: SplitId,
    pub amount: u128, // Using u128 instead of U128 for JsonSchema
    pub token_id: Option<String>,
    pub timestamp: u64,
    pub transactions: Vec<Transaction>,
}

/// Pending distribution structure
#[derive(BorshDeserialize, BorshSerialize, Clone, Debug, Serialize, Deserialize, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct PendingDistribution {
    pub id: String,
    pub github_username: String,
    pub amount: u128,
    pub token: String,
    pub timestamp: u64,
    pub claimed: bool,
}

/// Chain signature structure
#[derive(BorshDeserialize, BorshSerialize, Clone, Debug, Serialize, Deserialize, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct ChainSignature {
    pub signature: String,
    pub public_key: String,
    pub chain_id: String,
}

#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct GitSplitsContract {
    // Worker agent management
    registered_workers: LookupMap<AccountId, WorkerInfo>,
    allowed_code_hashes: Vector<String>,

    // Repository splits
    splits: UnorderedMap<SplitId, Split>,
    splits_by_repo: LookupMap<String, SplitId>,

    // GitHub identity verification
    github_identities: LookupMap<String, AccountId>,
    account_github_identities: LookupMap<AccountId, String>,

    // Distribution history
    distributions: UnorderedMap<DistributionId, Distribution>,
    split_distributions: LookupMap<SplitId, Vector<DistributionId>>,

    // Social verification
    github_to_x_mappings: LookupMap<String, String>,
    verified_wallets: LookupMap<String, AccountId>,
    pending_distributions: UnorderedMap<String, PendingDistribution>,

    // Admin settings
    owner: AccountId,
}

#[near_bindgen]
impl GitSplitsContract {
    #[init]
    pub fn new() -> Self {
        assert!(!env::state_exists(), "Already initialized");
        Self {
            registered_workers: LookupMap::new(StorageKey::RegisteredWorkers),
            allowed_code_hashes: Vector::new(StorageKey::AllowedCodeHashes),
            splits: UnorderedMap::new(StorageKey::Splits),
            splits_by_repo: LookupMap::new(StorageKey::SplitsByRepo),
            github_identities: LookupMap::new(StorageKey::GithubIdentities),
            account_github_identities: LookupMap::new(StorageKey::AccountGithubIdentities),
            distributions: UnorderedMap::new(StorageKey::Distributions),
            split_distributions: LookupMap::new(StorageKey::SplitDistributions),
            github_to_x_mappings: LookupMap::new(StorageKey::GithubToXMappings),
            verified_wallets: LookupMap::new(StorageKey::VerifiedWallets),
            pending_distributions: UnorderedMap::new(StorageKey::PendingDistributions),
            owner: env::predecessor_account_id(),
        }
    }

    // Worker Agent Management

    pub fn register_worker(&mut self, _attestation: Attestation, code_hash: String) -> bool {
        // In a real implementation, we would verify the attestation
        // For now, we'll just check if the code hash is allowed

        let caller = env::predecessor_account_id();
        let current_timestamp = env::block_timestamp();

        // Check if the code hash is allowed
        let mut is_allowed = false;
        for i in 0..self.allowed_code_hashes.len() {
            if self.allowed_code_hashes.get(i).unwrap() == code_hash {
                is_allowed = true;
                break;
            }
        }

        // If the owner is registering, allow it
        // LookupMap doesn't have is_empty(), so we'll check if any workers exist
        let first_worker = self.registered_workers.get(&self.owner).is_none() &&
                          self.allowed_code_hashes.len() == 0;

        if first_worker || env::predecessor_account_id() == self.owner {
            is_allowed = true;

            // Add the code hash to allowed list if it's not already there
            if !is_allowed {
                self.allowed_code_hashes.push(&code_hash);
            }
        }

        assert!(is_allowed, "Worker code hash is not allowed");

        // Register the worker
        self.registered_workers.insert(&caller, &WorkerInfo {
            code_hash: code_hash.clone(),
            registered_at: current_timestamp,
            last_active_at: current_timestamp,
        });

        true
    }

    pub fn is_worker_registered(&self, account_id: AccountId) -> bool {
        self.registered_workers.contains_key(&account_id)
    }

    // Repository Management

    pub fn create_split(&mut self, repo_url: String, owner: AccountId) -> SplitId {
        self.assert_worker_caller();

        // Check if a split already exists for this repo
        assert!(!self.splits_by_repo.contains_key(&repo_url), "Split already exists for this repository");

        // Generate a unique split ID
        let split_id = format!("split-{}", env::block_height());

        // Create the split
        let split = Split {
            id: split_id.clone(),
            repo_url: repo_url.clone(),
            owner: owner.to_string(), // Convert AccountId to String
            contributors: Vec::new(),
            created_at: env::block_timestamp(),
            updated_at: env::block_timestamp(),
        };

        // Store the split
        self.splits.insert(&split_id, &split);
        self.splits_by_repo.insert(&repo_url, &split_id);

        // Initialize distributions vector for this split
        let distributions = Vector::new(StorageKey::SplitDistributionsInner { split_id: split_id.clone() });
        self.split_distributions.insert(&split_id, &distributions);

        split_id
    }

    pub fn update_split(&mut self, split_id: SplitId, contributors: Vec<Contributor>) -> bool {
        self.assert_worker_caller();

        if let Some(mut split) = self.splits.get(&split_id) {
            // Validate that percentages add up to 100%
            let total_percentage: u128 = contributors.iter()
                .map(|c| c.percentage)
                .sum();

            assert_eq!(total_percentage, 100_000_000_000_000_000_000_000, "Percentages must add up to 100%");

            // Update the split
            split.contributors = contributors;
            split.updated_at = env::block_timestamp();

            self.splits.insert(&split_id, &split);
            true
        } else {
            false
        }
    }

    pub fn get_split(&self, split_id: SplitId) -> Option<Split> {
        self.splits.get(&split_id)
    }

    pub fn get_split_by_repo(&self, repo_url: String) -> Option<Split> {
        if let Some(split_id) = self.splits_by_repo.get(&repo_url) {
            self.splits.get(&split_id)
        } else {
            None
        }
    }

    // Chain Signatures (simplified for example)

    pub fn generate_chain_signature(&self, chain_id: String, _tx_data: String) -> ChainSignature {
        self.assert_worker_caller();

        // In a real implementation, this would use NEAR's chain signatures
        // For now, we'll just return a placeholder

        ChainSignature {
            signature: "signature_placeholder".to_string(),
            public_key: "public_key_placeholder".to_string(),
            chain_id,
        }
    }

    // Social Verification Methods

    /// Store verification of GitHub and X/Twitter identities
    pub fn store_verification(&mut self, github_username: String, x_username: String, wallet_address: AccountId) -> bool {
        self.assert_worker_caller();

        // Store the mappings
        self.github_to_x_mappings.insert(&github_username, &x_username);
        self.verified_wallets.insert(&github_username, &wallet_address);

        // Process any pending distributions
        self.process_pending_distributions(&github_username);

        true
    }

    /// Check if GitHub username is verified
    pub fn is_github_verified(&self, github_username: String) -> bool {
        self.verified_wallets.contains_key(&github_username)
    }

    /// Get X/Twitter username for GitHub username
    pub fn get_x_username(&self, github_username: String) -> Option<String> {
        self.github_to_x_mappings.get(&github_username)
    }

    /// Get wallet address for GitHub username
    pub fn get_wallet_address(&self, github_username: String) -> Option<AccountId> {
        self.verified_wallets.get(&github_username)
    }

    /// Get GitHub username for wallet address
    pub fn get_github_by_wallet(&self, wallet_address: AccountId) -> Option<String> {
        for (github_username, account_id) in self.verified_wallets.iter() {
            if account_id == wallet_address {
                return Some(github_username);
            }
        }
        None
    }

    /// Store a pending distribution for a GitHub username
    pub fn store_pending_distribution(&mut self, github_username: String, amount: u128, token: String) -> String {
        self.assert_worker_caller();

        let id = format!("pending-{}-{}", github_username, env::block_timestamp());

        let pending_distribution = PendingDistribution {
            id: id.clone(),
            github_username: github_username.clone(),
            amount,
            token,
            timestamp: env::block_timestamp(),
            claimed: false,
        };

        self.pending_distributions.insert(&id, &pending_distribution);

        id
    }

    /// Get pending distributions for a GitHub username
    pub fn get_pending_distributions(&self, github_username: String) -> Vec<PendingDistribution> {
        let mut result = Vec::new();

        for i in self.pending_distributions.keys() {
            if let Some(distribution) = self.pending_distributions.get(&i) {
                if distribution.github_username == github_username && !distribution.claimed {
                    result.push(distribution);
                }
            }
        }

        result
    }

    /// Process pending distributions after verification
    fn process_pending_distributions(&mut self, github_username: &String) {
        let pending = self.get_pending_distributions(github_username.clone());

        for distribution in pending {
            // Mark as claimed
            if let Some(mut dist) = self.pending_distributions.get(&distribution.id) {
                dist.claimed = true;
                self.pending_distributions.insert(&distribution.id, &dist);
            }
        }
    }

    // Helper methods

    fn assert_worker_caller(&self) {
        assert!(
            self.registered_workers.contains_key(&env::predecessor_account_id()),
            "Only registered workers can call this method"
        );
    }

    fn assert_owner(&self) {
        assert_eq!(
            env::predecessor_account_id(),
            self.owner,
            "Only the owner can call this method"
        );
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::test_utils::{accounts, VMContextBuilder};
    use near_sdk::testing_env;

    fn get_context(predecessor_account_id: AccountId) -> VMContextBuilder {
        let mut builder = VMContextBuilder::new();
        builder.predecessor_account_id(predecessor_account_id);
        builder
    }

    #[test]
    fn test_new() {
        let context = get_context(accounts(1));
        testing_env!(context.build());

        let contract = GitSplitsContract::new();
        assert_eq!(contract.owner, accounts(1));
    }

    #[test]
    fn test_register_worker() {
        let mut context = get_context(accounts(1));
        testing_env!(context.build());

        let mut contract = GitSplitsContract::new();

        // Register a worker
        let attestation = Attestation {
            quote: "test_quote".to_string(),
            endorsements: "test_endorsements".to_string(),
        };

        let result = contract.register_worker(attestation, "test_code_hash".to_string());
        assert!(result);

        // Check if worker is registered
        assert!(contract.is_worker_registered(accounts(1)));
    }

    #[test]
    fn test_create_split() {
        let mut context = get_context(accounts(1));
        testing_env!(context.build());

        let mut contract = GitSplitsContract::new();

        // Register a worker
        let attestation = Attestation {
            quote: "test_quote".to_string(),
            endorsements: "test_endorsements".to_string(),
        };

        contract.register_worker(attestation, "test_code_hash".to_string());

        // Create a split
        let repo_url = "github.com/test/repo".to_string();
        let split_id = contract.create_split(repo_url.clone(), accounts(2));

        // Check if split was created
        let split = contract.get_split(split_id.clone()).unwrap();
        assert_eq!(split.repo_url, repo_url);
        assert_eq!(split.owner, accounts(2).to_string());
    }
}
