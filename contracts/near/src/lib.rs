use near_sdk::borsh::{BorshDeserialize, BorshSerialize};
use near_sdk::{env, near, near_bindgen, AccountId, PanicOnDefault, BorshStorageKey};
use near_sdk::store::{LookupMap, UnorderedMap, Vector};
use near_sdk::serde::{Deserialize, Serialize};
use schemars::JsonSchema;

/// Storage keys for collections
#[derive(BorshSerialize, BorshStorageKey)]
#[borsh(crate = "near_sdk::borsh")]
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
#[borsh(crate = "near_sdk::borsh")]
#[serde(crate = "near_sdk::serde")]
pub struct Attestation {
    pub quote: String,
    pub endorsements: String,
}

/// Worker information
#[derive(BorshDeserialize, BorshSerialize, Clone, Debug, Serialize, Deserialize, JsonSchema)]
#[borsh(crate = "near_sdk::borsh")]
#[serde(crate = "near_sdk::serde")]
pub struct WorkerInfo {
    pub code_hash: String,
    pub registered_at: u64,
    pub last_active_at: u64,
}

/// Contributor structure
#[derive(BorshDeserialize, BorshSerialize, Clone, Debug, Serialize, Deserialize, JsonSchema)]
#[borsh(crate = "near_sdk::borsh")]
#[serde(crate = "near_sdk::serde")]
pub struct Contributor {
    pub github_username: String,
    pub account_id: Option<String>,
    pub percentage: u128,
}

/// Split structure
#[derive(BorshDeserialize, BorshSerialize, Clone, Debug, Serialize, Deserialize, JsonSchema)]
#[borsh(crate = "near_sdk::borsh")]
#[serde(crate = "near_sdk::serde")]
pub struct Split {
    pub id: SplitId,
    pub repo_url: String,
    pub owner: String,
    pub contributors: Vec<Contributor>,
    pub created_at: u64,
    pub updated_at: u64,
}

/// Transaction status enum
#[derive(BorshDeserialize, BorshSerialize, Clone, Debug, Serialize, Deserialize, JsonSchema)]
#[borsh(crate = "near_sdk::borsh")]
#[serde(crate = "near_sdk::serde")]
pub enum TransactionStatus {
    Pending,
    Completed,
    Failed,
}

/// Transaction structure
#[derive(BorshDeserialize, BorshSerialize, Clone, Debug, Serialize, Deserialize, JsonSchema)]
#[borsh(crate = "near_sdk::borsh")]
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
#[borsh(crate = "near_sdk::borsh")]
#[serde(crate = "near_sdk::serde")]
pub struct Distribution {
    pub id: DistributionId,
    pub split_id: SplitId,
    pub amount: u128,
    pub token_id: Option<String>,
    pub timestamp: u64,
    pub transactions: Vec<Transaction>,
}

/// Pending distribution structure
#[derive(BorshDeserialize, BorshSerialize, Clone, Debug, Serialize, Deserialize, JsonSchema)]
#[borsh(crate = "near_sdk::borsh")]
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
#[borsh(crate = "near_sdk::borsh")]
#[serde(crate = "near_sdk::serde")]
pub struct ChainSignature {
    pub signature: String,
    pub public_key: String,
    pub chain_id: String,
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct GitSplitsContract {
    registered_workers: LookupMap<AccountId, WorkerInfo>,
    allowed_code_hashes: Vector<String>,
    splits: UnorderedMap<SplitId, Split>,
    splits_by_repo: LookupMap<String, SplitId>,
    github_identities: LookupMap<String, AccountId>,
    account_github_identities: LookupMap<AccountId, String>,
    distributions: UnorderedMap<DistributionId, Distribution>,
    split_distributions: LookupMap<SplitId, Vector<DistributionId>>,
    github_to_x_mappings: LookupMap<String, String>,
    verified_wallets: UnorderedMap<String, AccountId>,
    pending_distributions: UnorderedMap<String, PendingDistribution>,
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
            verified_wallets: UnorderedMap::new(StorageKey::VerifiedWallets),
            pending_distributions: UnorderedMap::new(StorageKey::PendingDistributions),
            owner: env::predecessor_account_id(),
        }
    }

    pub fn register_worker(&mut self, _attestation: Attestation, code_hash: String) -> bool {
        let caller = env::predecessor_account_id();
        let current_timestamp = env::block_timestamp();

        let mut is_allowed = false;
        for existing_hash in self.allowed_code_hashes.iter() {
            if existing_hash == &code_hash {
                is_allowed = true;
                break;
            }
        }

        let first_worker = self.registered_workers.get(&self.owner).is_none() &&
                          self.allowed_code_hashes.len() == 0;

        if first_worker || env::predecessor_account_id() == self.owner {
            if !is_allowed {
                self.allowed_code_hashes.push(code_hash.clone());
                is_allowed = true;
            }
        }

        assert!(is_allowed, "Worker code hash is not allowed");

        self.registered_workers.insert(caller, WorkerInfo {
            code_hash,
            registered_at: current_timestamp,
            last_active_at: current_timestamp,
        });

        true
    }

    pub fn is_worker_registered(&self, account_id: AccountId) -> bool {
        self.registered_workers.contains_key(&account_id)
    }

    pub fn create_split(&mut self, repo_url: String, owner: AccountId) -> SplitId {
        self.assert_worker_caller();
        assert!(!self.splits_by_repo.contains_key(&repo_url), "Split already exists for this repository");

        let split_id = format!("split-{}", env::block_height());
        let split = Split {
            id: split_id.clone(),
            repo_url: repo_url.clone(),
            owner: owner.to_string(),
            contributors: Vec::new(),
            created_at: env::block_timestamp(),
            updated_at: env::block_timestamp(),
        };

        self.splits.insert(split_id.clone(), split);
        self.splits_by_repo.insert(repo_url, split_id.clone());

        let distributions = Vector::new(StorageKey::SplitDistributionsInner { split_id: split_id.clone() });
        self.split_distributions.insert(split_id.clone(), distributions);

        split_id
    }

    pub fn update_split(&mut self, split_id: SplitId, contributors: Vec<Contributor>) -> bool {
        self.assert_worker_caller();

        if let Some(split) = self.splits.get_mut(&split_id) {
            let total_percentage: u128 = contributors.iter()
                .map(|c| c.percentage)
                .sum();

            assert_eq!(total_percentage, 100_000_000_000_000_000_000_000, "Percentages must add up to 100%");

            split.contributors = contributors;
            split.updated_at = env::block_timestamp();
            true
        } else {
            false
        }
    }

    pub fn get_split(&self, split_id: SplitId) -> Option<&Split> {
        self.splits.get(&split_id)
    }

    pub fn get_split_by_repo(&self, repo_url: String) -> Option<&Split> {
        if let Some(split_id) = self.splits_by_repo.get(&repo_url) {
            self.splits.get(split_id)
        } else {
            None
        }
    }

    pub fn generate_chain_signature(&self, chain_id: String, _tx_data: String) -> ChainSignature {
        self.assert_worker_caller();
        ChainSignature {
            signature: "signature_placeholder".to_string(),
            public_key: "public_key_placeholder".to_string(),
            chain_id,
        }
    }

    pub fn store_verification(&mut self, github_username: String, x_username: String, wallet_address: AccountId) -> bool {
        self.assert_worker_caller();
        self.github_to_x_mappings.insert(github_username.clone(), x_username);
        self.verified_wallets.insert(github_username.clone(), wallet_address);
        self.process_pending_distributions(&github_username);
        true
    }

    pub fn is_github_verified(&self, github_username: String) -> bool {
        self.verified_wallets.contains_key(&github_username)
    }

    pub fn get_x_username(&self, github_username: String) -> Option<&String> {
        self.github_to_x_mappings.get(&github_username)
    }

    pub fn get_wallet_address(&self, github_username: String) -> Option<&AccountId> {
        self.verified_wallets.get(&github_username)
    }

    pub fn get_github_by_wallet(&self, wallet_address: AccountId) -> Option<String> {
        for (github_username, account_id) in self.verified_wallets.iter() {
            if account_id == &wallet_address {
                return Some(github_username.clone());
            }
        }
        None
    }

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
        self.pending_distributions.insert(id.clone(), pending_distribution);
        id
    }

    pub fn get_pending_distributions(&self, github_username: String) -> Vec<PendingDistribution> {
        let mut result = Vec::new();
        for distribution in self.pending_distributions.values() {
            if distribution.github_username == github_username && !distribution.claimed {
                result.push(distribution.clone());
            }
        }
        result
    }

    fn process_pending_distributions(&mut self, github_username: &String) {
        let pending_ids: Vec<String> = self.pending_distributions.values()
            .filter(|d| &d.github_username == github_username && !d.claimed)
            .map(|d| d.id.clone())
            .collect();

        for id in pending_ids {
            if let Some(dist) = self.pending_distributions.get_mut(&id) {
                dist.claimed = true;
            }
        }
    }

    fn assert_worker_caller(&self) {
        assert!(
            self.registered_workers.contains_key(&env::predecessor_account_id()),
            "Only registered workers can call this method"
        );
    }

    #[allow(dead_code)]
    fn assert_owner(&self) {
        assert_eq!(
            env::predecessor_account_id(),
            self.owner,
            "Only the owner can call this method"
        );
    }
}
