use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::collections::{LookupMap, UnorderedMap, Vector};
use near_sdk::json_types::U128;
use near_sdk::serde::{Deserialize, Serialize};
use near_sdk::{env, near_bindgen, AccountId, Balance, PanicOnDefault, Promise};

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
    
    // Admin settings
    owner: AccountId,
}

// Type aliases for clarity
pub type SplitId = String;
pub type DistributionId = String;

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize)]
#[serde(crate = "near_sdk::serde")]
pub struct WorkerInfo {
    pub account_id: AccountId,
    pub code_hash: String,
    pub registered_at: u64,
    pub last_active_at: u64,
}

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize)]
#[serde(crate = "near_sdk::serde")]
pub struct Split {
    pub id: SplitId,
    pub repo_url: String,
    pub owner: AccountId,
    pub contributors: Vec<Contributor>,
    pub created_at: u64,
    pub updated_at: u64,
}

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone)]
#[serde(crate = "near_sdk::serde")]
pub struct Contributor {
    pub github_username: String,
    pub account_id: Option<AccountId>,
    pub percentage: U128,
}

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize)]
#[serde(crate = "near_sdk::serde")]
pub struct Distribution {
    pub id: DistributionId,
    pub split_id: SplitId,
    pub amount: U128,
    pub token_id: Option<String>,
    pub timestamp: u64,
    pub transactions: Vec<Transaction>,
}

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize)]
#[serde(crate = "near_sdk::serde")]
pub struct Transaction {
    pub chain_id: String,
    pub recipient: String,
    pub amount: String,
    pub tx_hash: Option<String>,
    pub status: TransactionStatus,
}

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize)]
#[serde(crate = "near_sdk::serde")]
pub enum TransactionStatus {
    Pending,
    Completed,
    Failed,
}

#[derive(Serialize, Deserialize)]
#[serde(crate = "near_sdk::serde")]
pub struct Attestation {
    pub quote: String,
    pub endorsements: String,
}

#[derive(Serialize, Deserialize)]
#[serde(crate = "near_sdk::serde")]
pub struct ChainSignature {
    pub signature: String,
    pub public_key: String,
    pub chain_id: String,
}

#[near_bindgen]
impl GitSplitsContract {
    #[init]
    pub fn new() -> Self {
        assert!(!env::state_exists(), "Already initialized");
        Self {
            registered_workers: LookupMap::new(b"registered_workers"),
            allowed_code_hashes: Vector::new(b"allowed_code_hashes"),
            splits: UnorderedMap::new(b"splits"),
            splits_by_repo: LookupMap::new(b"splits_by_repo"),
            github_identities: LookupMap::new(b"github_identities"),
            account_github_identities: LookupMap::new(b"account_github_identities"),
            distributions: UnorderedMap::new(b"distributions"),
            split_distributions: LookupMap::new(b"split_distributions"),
            owner: env::predecessor_account_id(),
        }
    }

    // Worker Agent Management

    pub fn register_worker(&mut self, attestation: Attestation, code_hash: String) -> bool {
        // In a real implementation, we would verify the attestation using Phala's libraries
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
        
        // If this is the first worker or the owner is registering, allow it
        if self.registered_workers.len() == 0 || env::predecessor_account_id() == self.owner {
            is_allowed = true;
            
            // Add the code hash to allowed list if it's not already there
            if !is_allowed {
                self.allowed_code_hashes.push(&code_hash);
            }
        }
        
        assert!(is_allowed, "Worker code hash is not allowed");
        
        // Register the worker
        self.registered_workers.insert(&caller, &WorkerInfo {
            account_id: caller.clone(),
            code_hash: code_hash.clone(),
            registered_at: current_timestamp,
            last_active_at: current_timestamp,
        });
        
        true
    }

    pub fn is_worker_registered(&self, account_id: AccountId) -> bool {
        self.registered_workers.contains_key(&account_id)
    }

    pub fn update_worker_activity(&mut self, account_id: AccountId) -> bool {
        self.assert_worker_caller();
        
        if let Some(mut worker_info) = self.registered_workers.get(&account_id) {
            worker_info.last_active_at = env::block_timestamp();
            self.registered_workers.insert(&account_id, &worker_info);
            true
        } else {
            false
        }
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
            owner,
            contributors: Vec::new(),
            created_at: env::block_timestamp(),
            updated_at: env::block_timestamp(),
        };
        
        // Store the split
        self.splits.insert(&split_id, &split);
        self.splits_by_repo.insert(&repo_url, &split_id);
        
        // Initialize distributions vector for this split
        let mut distributions = Vector::new(format!("split_distributions:{}", split_id).as_bytes());
        self.split_distributions.insert(&split_id, &distributions);
        
        split_id
    }

    pub fn update_split(&mut self, split_id: SplitId, contributors: Vec<Contributor>) -> bool {
        self.assert_worker_caller();
        
        if let Some(mut split) = self.splits.get(&split_id) {
            // Validate that percentages add up to 100%
            let total_percentage: u128 = contributors.iter()
                .map(|c| c.percentage.0)
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

    // Fund Distribution

    pub fn distribute_funds(&mut self, split_id: SplitId, amount: U128, token_id: Option<String>) -> DistributionId {
        self.assert_worker_caller();
        
        // Get the split
        let split = self.splits.get(&split_id).expect("Split not found");
        
        // Ensure there are contributors
        assert!(!split.contributors.is_empty(), "No contributors in split");
        
        // Generate a unique distribution ID
        let distribution_id = format!("dist-{}", env::block_height());
        
        // Create transactions for each contributor
        let mut transactions = Vec::new();
        for contributor in &split.contributors {
            // Calculate amount for this contributor
            let contributor_amount = (amount.0 * contributor.percentage.0) / 100_000_000_000_000_000_000_000;
            
            // If contributor has a linked account, create a transaction
            if let Some(account_id) = &contributor.account_id {
                transactions.push(Transaction {
                    chain_id: "near".to_string(),
                    recipient: account_id.to_string(),
                    amount: contributor_amount.to_string(),
                    tx_hash: None,
                    status: TransactionStatus::Pending,
                });
            } else {
                // For contributors without linked accounts, we'll hold their funds
                // In a real implementation, we might want to store these for later claiming
                transactions.push(Transaction {
                    chain_id: "near".to_string(),
                    recipient: format!("pending:{}", contributor.github_username),
                    amount: contributor_amount.to_string(),
                    tx_hash: None,
                    status: TransactionStatus::Pending,
                });
            }
        }
        
        // Create the distribution
        let distribution = Distribution {
            id: distribution_id.clone(),
            split_id: split_id.clone(),
            amount,
            token_id,
            timestamp: env::block_timestamp(),
            transactions,
        };
        
        // Store the distribution
        self.distributions.insert(&distribution_id, &distribution);
        
        // Add to split's distributions
        if let Some(mut distributions) = self.split_distributions.get(&split_id) {
            distributions.push(&distribution_id);
            self.split_distributions.insert(&split_id, &distributions);
        }
        
        distribution_id
    }

    pub fn update_transaction_status(&mut self, distribution_id: DistributionId, tx_index: u64, tx_hash: String, status: TransactionStatus) -> bool {
        self.assert_worker_caller();
        
        if let Some(mut distribution) = self.distributions.get(&distribution_id) {
            if tx_index < distribution.transactions.len() as u64 {
                distribution.transactions[tx_index as usize].tx_hash = Some(tx_hash);
                distribution.transactions[tx_index as usize].status = status;
                
                self.distributions.insert(&distribution_id, &distribution);
                true
            } else {
                false
            }
        } else {
            false
        }
    }

    pub fn get_distribution(&self, distribution_id: DistributionId) -> Option<Distribution> {
        self.distributions.get(&distribution_id)
    }

    pub fn get_distribution_history(&self, split_id: SplitId) -> Vec<DistributionId> {
        if let Some(distributions) = self.split_distributions.get(&split_id) {
            let mut result = Vec::new();
            for i in 0..distributions.len() {
                result.push(distributions.get(i).unwrap());
            }
            result
        } else {
            Vec::new()
        }
    }

    // GitHub Identity Verification

    pub fn verify_github_identity(&mut self, github_username: String, account_id: AccountId) -> bool {
        self.assert_worker_caller();
        
        // Check if this GitHub username is already linked
        if self.github_identities.contains_key(&github_username) {
            return false;
        }
        
        // Check if this account already has a linked GitHub username
        if self.account_github_identities.contains_key(&account_id) {
            return false;
        }
        
        // Link the GitHub username to the account
        self.github_identities.insert(&github_username, &account_id);
        self.account_github_identities.insert(&account_id, &github_username);
        
        // Update any pending distributions for this GitHub username
        for i in 0..self.distributions.len() {
            if let Some(distribution_id) = self.distributions.keys_as_vector().get(i) {
                if let Some(mut distribution) = self.distributions.get(&distribution_id) {
                    for tx in &mut distribution.transactions {
                        if tx.recipient == format!("pending:{}", github_username) {
                            tx.recipient = account_id.to_string();
                            tx.status = TransactionStatus::Pending;
                        }
                    }
                    self.distributions.insert(&distribution_id, &distribution);
                }
            }
        }
        
        true
    }

    pub fn get_github_identity(&self, account_id: AccountId) -> Option<String> {
        self.account_github_identities.get(&account_id)
    }

    pub fn get_account_for_github(&self, github_username: String) -> Option<AccountId> {
        self.github_identities.get(&github_username)
    }

    // Chain Signatures (simplified for example)

    pub fn generate_chain_signature(&self, chain_id: String, tx_data: String) -> ChainSignature {
        self.assert_worker_caller();
        
        // In a real implementation, this would use NEAR's chain signatures
        // For now, we'll just return a placeholder
        
        ChainSignature {
            signature: "signature_placeholder".to_string(),
            public_key: "public_key_placeholder".to_string(),
            chain_id,
        }
    }

    // Admin functions

    pub fn add_allowed_code_hash(&mut self, code_hash: String) -> bool {
        self.assert_owner();
        
        // Check if already allowed
        for i in 0..self.allowed_code_hashes.len() {
            if self.allowed_code_hashes.get(i).unwrap() == code_hash {
                return false;
            }
        }
        
        self.allowed_code_hashes.push(&code_hash);
        true
    }

    pub fn remove_allowed_code_hash(&mut self, code_hash: String) -> bool {
        self.assert_owner();
        
        let mut index_to_remove = None;
        for i in 0..self.allowed_code_hashes.len() {
            if self.allowed_code_hashes.get(i).unwrap() == code_hash {
                index_to_remove = Some(i);
                break;
            }
        }
        
        if let Some(index) = index_to_remove {
            // In a real implementation, we would need to handle this more efficiently
            // For simplicity, we'll just swap with the last element and pop
            let last_index = self.allowed_code_hashes.len() - 1;
            if index != last_index {
                let last_hash = self.allowed_code_hashes.get(last_index).unwrap();
                self.allowed_code_hashes.replace(index, &last_hash);
            }
            self.allowed_code_hashes.pop();
            true
        } else {
            false
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
    use near_sdk::{testing_env, VMContext};

    fn get_context(predecessor_account_id: AccountId) -> VMContext {
        let mut builder = VMContextBuilder::new();
        builder.predecessor_account_id(predecessor_account_id);
        builder.build()
    }

    #[test]
    fn test_new() {
        let context = get_context(accounts(1));
        testing_env!(context);
        
        let contract = GitSplitsContract::new();
        assert_eq!(contract.owner, accounts(1));
    }

    #[test]
    fn test_register_worker() {
        let mut context = get_context(accounts(1));
        testing_env!(context.clone());
        
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
        testing_env!(context.clone());
        
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
        assert_eq!(split.owner, accounts(2));
        
        // Check if split can be retrieved by repo URL
        let split_by_repo = contract.get_split_by_repo(repo_url).unwrap();
        assert_eq!(split_by_repo.id, split_id);
    }

    #[test]
    fn test_update_split() {
        let mut context = get_context(accounts(1));
        testing_env!(context.clone());
        
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
        
        // Update the split with contributors
        let contributors = vec![
            Contributor {
                github_username: "user1".to_string(),
                account_id: Some(accounts(3)),
                percentage: U128(50_000_000_000_000_000_000_000), // 50%
            },
            Contributor {
                github_username: "user2".to_string(),
                account_id: Some(accounts(4)),
                percentage: U128(50_000_000_000_000_000_000_000), // 50%
            },
        ];
        
        let result = contract.update_split(split_id.clone(), contributors);
        assert!(result);
        
        // Check if split was updated
        let split = contract.get_split(split_id).unwrap();
        assert_eq!(split.contributors.len(), 2);
        assert_eq!(split.contributors[0].github_username, "user1");
        assert_eq!(split.contributors[1].github_username, "user2");
    }
}
