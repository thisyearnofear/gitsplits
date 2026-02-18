use near_sdk::borsh::{BorshDeserialize, BorshSerialize};
use near_sdk::{env, near, near_bindgen, AccountId, PanicOnDefault, BorshStorageKey};
use near_sdk::store::{LookupMap, UnorderedMap, Vector};
use near_sdk::serde_json::json;
use near_sdk::serde::{Deserialize, Serialize};
use schemars::JsonSchema;
use std::collections::HashSet;

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
    WalletToGithub,
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

/// Public verification mapping entry
#[derive(BorshDeserialize, BorshSerialize, Clone, Debug, Serialize, Deserialize, JsonSchema)]
#[borsh(crate = "near_sdk::borsh")]
#[serde(crate = "near_sdk::serde")]
pub struct VerificationEntry {
    pub github_username: String,
    pub wallet_address: String,
    pub x_username: Option<String>,
}

#[derive(BorshDeserialize, BorshSerialize, Clone, Debug, Serialize, Deserialize, JsonSchema)]
#[borsh(crate = "near_sdk::borsh")]
#[serde(crate = "near_sdk::serde")]
pub struct VerificationPage {
    pub entries: Vec<VerificationEntry>,
    pub next_cursor: Option<String>,
    pub total: u64,
}

#[derive(BorshDeserialize, BorshSerialize, Clone, Debug, Serialize, Deserialize, JsonSchema)]
#[borsh(crate = "near_sdk::borsh")]
#[serde(crate = "near_sdk::serde")]
pub struct RepoVerificationStatus {
    pub split_id: Option<String>,
    pub repo_url: String,
    pub total_contributors: u64,
    pub verified: Vec<VerificationEntry>,
    pub unverified: Vec<String>,
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
    wallet_to_github: LookupMap<AccountId, String>,
    pending_distributions: UnorderedMap<String, PendingDistribution>,
    next_split_nonce: u64,
    owner: AccountId,
}

#[derive(BorshDeserialize, BorshSerialize)]
#[borsh(crate = "near_sdk::borsh")]
pub struct GitSplitsContractV1 {
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
            wallet_to_github: LookupMap::new(StorageKey::WalletToGithub),
            pending_distributions: UnorderedMap::new(StorageKey::PendingDistributions),
            next_split_nonce: 1,
            owner: env::predecessor_account_id(),
        }
    }

    #[init(ignore_state)]
    pub fn migrate() -> Self {
        let old_state: GitSplitsContractV1 = env::state_read().expect("Old state doesn't exist");
        assert_eq!(
            env::predecessor_account_id(),
            old_state.owner,
            "Only owner can migrate state"
        );

        let mut wallet_to_github: LookupMap<AccountId, String> = LookupMap::new(StorageKey::WalletToGithub);
        for (github_username, wallet_address) in old_state.verified_wallets.iter() {
            wallet_to_github.insert(wallet_address.clone(), github_username.clone());
        }

        Self {
            registered_workers: old_state.registered_workers,
            allowed_code_hashes: old_state.allowed_code_hashes,
            splits: old_state.splits,
            splits_by_repo: old_state.splits_by_repo,
            github_identities: old_state.github_identities,
            account_github_identities: old_state.account_github_identities,
            distributions: old_state.distributions,
            split_distributions: old_state.split_distributions,
            github_to_x_mappings: old_state.github_to_x_mappings,
            verified_wallets: old_state.verified_wallets,
            wallet_to_github,
            pending_distributions: old_state.pending_distributions,
            next_split_nonce: 1,
            owner: old_state.owner,
        }
    }

    pub fn add_allowed_code_hash(&mut self, code_hash: String) -> bool {
        self.assert_owner();
        if self.allowed_code_hashes.iter().any(|hash| hash == &code_hash) {
            return false;
        }
        self.allowed_code_hashes.push(code_hash);
        true
    }

    pub fn register_worker(&mut self, _attestation: Attestation, code_hash: String) -> bool {
        let caller = env::predecessor_account_id();
        let current_timestamp = env::block_timestamp();

        if self.allowed_code_hashes.is_empty() {
            assert_eq!(caller, self.owner, "Only owner can bootstrap worker code hash");
            self.allowed_code_hashes.push(code_hash.clone());
        }

        let is_allowed = self.allowed_code_hashes.iter().any(|existing_hash| existing_hash == &code_hash);
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

        let split_id = format!("split-{}-{}", env::block_height(), self.next_split_nonce);
        self.next_split_nonce = self.next_split_nonce.saturating_add(1);
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
        assert!(!contributors.is_empty(), "Contributors cannot be empty");
        assert!(contributors.len() <= 200, "Too many contributors");

        if let Some(split) = self.splits.get_mut(&split_id) {
            let mut seen: HashSet<String> = HashSet::new();
            let mut normalized_contributors: Vec<Contributor> = Vec::with_capacity(contributors.len());
            for contributor in contributors.iter() {
                let normalized_username = normalize_github_username(&contributor.github_username);
                assert!(!normalized_username.is_empty(), "Contributor username cannot be empty");
                assert!(contributor.percentage > 0, "Contributor percentage must be > 0");
                assert!(
                    seen.insert(normalized_username.clone()),
                    "Duplicate contributor username"
                );
                normalized_contributors.push(Contributor {
                    github_username: normalized_username,
                    account_id: contributor.account_id.clone(),
                    percentage: contributor.percentage,
                });
            }

            let total_percentage: u128 = normalized_contributors.iter()
                .map(|c| c.percentage)
                .sum();

            assert_eq!(total_percentage, 100_000_000_000_000_000_000_000, "Percentages must add up to 100%");

            split.contributors = normalized_contributors;
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
        let normalized_github = normalize_github_username(&github_username);
        assert!(!normalized_github.is_empty(), "GitHub username cannot be empty");

        if let Some(previous_wallet) = self.verified_wallets.get(&normalized_github).cloned() {
            self.wallet_to_github.remove(&previous_wallet);
        }
        if let Some(existing_github_for_wallet) = self.wallet_to_github.get(&wallet_address).cloned() {
            if existing_github_for_wallet != normalized_github {
                self.verified_wallets.remove(&existing_github_for_wallet);
                self.github_to_x_mappings.remove(&existing_github_for_wallet);
            }
        }

        self.github_to_x_mappings.insert(normalized_github.clone(), x_username);
        self.verified_wallets.insert(normalized_github.clone(), wallet_address.clone());
        self.wallet_to_github.insert(wallet_address.clone(), normalized_github.clone());

        let event = VerificationEntry {
            github_username: normalized_github.clone(),
            wallet_address: wallet_address.to_string(),
            x_username: self.github_to_x_mappings.get(&normalized_github).cloned(),
        };
        emit_verification_event("verification_stored", &event);
        self.process_pending_distributions(&normalized_github);
        true
    }

    pub fn update_verification(&mut self, github_username: String, wallet_address: AccountId) -> bool {
        self.assert_worker_caller();
        let normalized_github = normalize_github_username(&github_username);
        assert!(!normalized_github.is_empty(), "GitHub username cannot be empty");

        if let Some(previous_wallet) = self.verified_wallets.get(&normalized_github).cloned() {
            self.wallet_to_github.remove(&previous_wallet);
        }
        if let Some(existing_github_for_wallet) = self.wallet_to_github.get(&wallet_address).cloned() {
            if existing_github_for_wallet != normalized_github {
                self.verified_wallets.remove(&existing_github_for_wallet);
                self.github_to_x_mappings.remove(&existing_github_for_wallet);
            }
        }

        self.verified_wallets.insert(normalized_github.clone(), wallet_address.clone());
        self.wallet_to_github.insert(wallet_address.clone(), normalized_github.clone());

        let event = VerificationEntry {
            github_username: normalized_github.clone(),
            wallet_address: wallet_address.to_string(),
            x_username: self.github_to_x_mappings.get(&normalized_github).cloned(),
        };
        emit_verification_event("verification_updated", &event);
        self.process_pending_distributions(&normalized_github);
        true
    }

    pub fn revoke_verification(&mut self, github_username: String) -> bool {
        self.assert_worker_caller();
        let normalized_github = normalize_github_username(&github_username);
        if let Some(wallet_address) = self.verified_wallets.remove(&normalized_github) {
            self.wallet_to_github.remove(&wallet_address);
            let removed_x = self.github_to_x_mappings.remove(&normalized_github);
            let event = VerificationEntry {
                github_username: normalized_github,
                wallet_address: wallet_address.to_string(),
                x_username: removed_x,
            };
            emit_verification_event("verification_revoked", &event);
            true
        } else {
            false
        }
    }

    pub fn is_github_verified(&self, github_username: String) -> bool {
        let normalized_github = normalize_github_username(&github_username);
        self.verified_wallets.contains_key(&normalized_github)
    }

    pub fn get_x_username(&self, github_username: String) -> Option<&String> {
        let normalized_github = normalize_github_username(&github_username);
        self.github_to_x_mappings.get(&normalized_github)
    }

    pub fn get_wallet_address(&self, github_username: String) -> Option<&AccountId> {
        let normalized_github = normalize_github_username(&github_username);
        self.verified_wallets.get(&normalized_github)
    }

    pub fn get_github_by_wallet(&self, wallet_address: AccountId) -> Option<String> {
        self.wallet_to_github.get(&wallet_address).cloned()
    }

    pub fn get_verification_count(&self) -> u64 {
        self.verified_wallets.len() as u64
    }

    pub fn get_verified_wallets_page(&self, offset: Option<u64>, limit: Option<u64>) -> Vec<VerificationEntry> {
        let start = offset.unwrap_or(0) as usize;
        let page_size = limit.unwrap_or(50).min(200) as usize;
        let mut all_entries: Vec<VerificationEntry> = self.verified_wallets.iter().map(|(github_username, account_id)| VerificationEntry {
            github_username: github_username.clone(),
            wallet_address: account_id.to_string(),
            x_username: self.github_to_x_mappings.get(github_username).cloned(),
        }).collect();
        all_entries.sort_by(|a, b| a.github_username.cmp(&b.github_username));
        all_entries
            .into_iter()
            .skip(start)
            .take(page_size)
            .collect()
    }

    pub fn get_verified_wallets_cursor(&self, start_after: Option<String>, limit: Option<u64>) -> VerificationPage {
        let page_size = limit.unwrap_or(50).min(200) as usize;
        let start_key = start_after.map(|s| normalize_github_username(&s));

        let mut all_entries: Vec<VerificationEntry> = self.verified_wallets.iter().map(|(github_username, account_id)| VerificationEntry {
            github_username: github_username.clone(),
            wallet_address: account_id.to_string(),
            x_username: self.github_to_x_mappings.get(github_username).cloned(),
        }).collect();
        all_entries.sort_by(|a, b| a.github_username.cmp(&b.github_username));

        let filtered: Vec<VerificationEntry> = all_entries
            .into_iter()
            .filter(|entry| {
                if let Some(ref key) = start_key {
                    entry.github_username > *key
                } else {
                    true
                }
            })
            .collect();

        let total = filtered.len() as u64;
        let entries: Vec<VerificationEntry> = filtered.into_iter().take(page_size).collect();
        let next_cursor = if entries.len() == page_size {
            entries.last().map(|entry| entry.github_username.clone())
        } else {
            None
        };

        VerificationPage {
            entries,
            next_cursor,
            total,
        }
    }

    pub fn get_verified_wallets_by_usernames(&self, github_usernames: Vec<String>) -> Vec<VerificationEntry> {
        github_usernames
            .into_iter()
            .filter_map(|username| {
                self.verified_wallets.get(&username).map(|account_id| VerificationEntry {
                    github_username: username.clone(),
                    wallet_address: account_id.to_string(),
                    x_username: self.github_to_x_mappings.get(&username).cloned(),
                })
            })
            .collect()
    }

    pub fn store_pending_distribution(&mut self, github_username: String, amount: u128, token: String) -> String {
        self.assert_worker_caller();
        let normalized_github = normalize_github_username(&github_username);
        let id = format!("pending-{}-{}", normalized_github, env::block_timestamp());
        let pending_distribution = PendingDistribution {
            id: id.clone(),
            github_username: normalized_github.clone(),
            amount,
            token,
            timestamp: env::block_timestamp(),
            claimed: false,
        };
        self.pending_distributions.insert(id.clone(), pending_distribution);
        id
    }

    pub fn get_pending_distributions(&self, github_username: String) -> Vec<PendingDistribution> {
        let normalized_github = normalize_github_username(&github_username);
        let mut result = Vec::new();
        for distribution in self.pending_distributions.values() {
            if normalize_github_username(&distribution.github_username) == normalized_github && !distribution.claimed {
                result.push(distribution.clone());
            }
        }
        result
    }

    pub fn get_repo_verification_status(&self, repo_url: String) -> RepoVerificationStatus {
        if let Some(split_id) = self.splits_by_repo.get(&repo_url) {
            if let Some(split) = self.splits.get(split_id) {
                let mut verified = Vec::new();
                let mut unverified = Vec::new();

                for contributor in split.contributors.iter() {
                    let normalized_username = normalize_github_username(&contributor.github_username);
                    if let Some(wallet_address) = self.verified_wallets.get(&normalized_username) {
                        verified.push(VerificationEntry {
                            github_username: normalized_username.clone(),
                            wallet_address: wallet_address.to_string(),
                            x_username: self.github_to_x_mappings.get(&normalized_username).cloned(),
                        });
                    } else {
                        unverified.push(normalized_username);
                    }
                }

                return RepoVerificationStatus {
                    split_id: Some(split.id.clone()),
                    repo_url,
                    total_contributors: split.contributors.len() as u64,
                    verified,
                    unverified,
                };
            }
        }

        RepoVerificationStatus {
            split_id: None,
            repo_url,
            total_contributors: 0,
            verified: Vec::new(),
            unverified: Vec::new(),
        }
    }

    fn process_pending_distributions(&mut self, github_username: &String) {
        let normalized_github = normalize_github_username(github_username);
        let pending_ids: Vec<String> = self.pending_distributions.values()
            .filter(|d| normalize_github_username(&d.github_username) == normalized_github && !d.claimed)
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

fn normalize_github_username(input: &str) -> String {
    input.trim().trim_start_matches('@').to_ascii_lowercase()
}

fn emit_verification_event(event_name: &str, entry: &VerificationEntry) {
    env::log_str(
        &json!({
            "standard": "gitsplits",
            "version": "1.0.0",
            "event": event_name,
            "data": entry,
        })
        .to_string(),
    );
}
