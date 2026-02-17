/**
 * NEAR Tool
 * 
 * Interacts with the GitSplits NEAR smart contract.
 * Falls back to mock mode if contract not deployed.
 */

import { connect, keyStores, KeyPair, Contract } from 'near-api-js';

let contract: any = null;
let useMockMode = false;
const isProductionMode = process.env.AGENT_MODE === 'production';

async function initNear() {
  if (contract || useMockMode) return;
  
  const accountId = process.env.NEAR_ACCOUNT_ID;
  const privateKey = process.env.NEAR_PRIVATE_KEY;
  const contractId = process.env.NEAR_CONTRACT_ID;
  
  if (!accountId || !privateKey || !contractId) {
    if (isProductionMode) {
      throw new Error('[NEAR] Missing required NEAR credentials in production mode');
    }
    console.log('[NEAR] Credentials not configured, using mock mode');
    useMockMode = true;
    return;
  }
  
  try {
    const keyStore = new keyStores.InMemoryKeyStore();
    const keyPair = KeyPair.fromString(privateKey);
    await keyStore.setKey('mainnet', accountId, keyPair);
    
    const near = await connect({
      networkId: 'mainnet',
      nodeUrl: 'https://rpc.mainnet.near.org',
      keyStore,
    });
    
    const account = await near.account(accountId);
    
    // Check if contract account exists and has deployed code
    const contractAccount = await near.account(contractId);
    const state = await contractAccount.state();
    if (state.code_hash === '11111111111111111111111111111111') {
      if (isProductionMode) {
        throw new Error(`[NEAR] Contract account ${contractId} has no deployed code`);
      }
      console.log('[NEAR] No contract deployed, using mock mode');
      useMockMode = true;
      return;
    }
    
    contract = new Contract(account, contractId, {
      viewMethods: [
        'get_split',
        'get_split_by_repo',
        'is_github_verified',
        'get_wallet_address',
      ],
      changeMethods: [
        'create_split',
        'update_split',
        'store_verification',
        'store_pending_verification',
      ],
      useLocalViewExecution: false,
    });
    
    console.log('[NEAR] Connected to contract:', contractId);
  } catch (error: any) {
    if (isProductionMode) {
      throw new Error(`[NEAR] Connection failed in production mode: ${error.message}`);
    }
    console.log('[NEAR] Connection failed, using mock mode:', error.message);
    useMockMode = true;
  }
}

export const nearTool = {
  name: 'near',
  
  async getSplit(repoUrl: string) {
    await initNear();
    
    if (useMockMode) {
      return {
        id: 'split-mock-123',
        repo_url: repoUrl,
        owner: 'mock.near',
        contributors: [
          { github_username: 'alice', percentage: 40, wallet: 'alice.near' },
          { github_username: 'bob', percentage: 30, wallet: 'bob.near' },
          { github_username: 'charlie', percentage: 20, wallet: 'charlie.near' },
          { github_username: 'dave', percentage: 10, wallet: 'dave.near' },
        ],
      };
    }
    
    return await contract.get_split_by_repo({ repo_url: repoUrl });
  },
  
  async createSplit(params: {
    repoUrl: string;
    owner: string;
    contributors: Array<{ github_username: string; percentage: number }>;
  }) {
    await initNear();
    
    if (useMockMode) {
      return {
        id: `split-${Date.now()}`,
        repoUrl: params.repoUrl,
        contributors: params.contributors,
      };
    }
    
    const formattedContributors = params.contributors.map((c) => ({
      github_username: c.github_username,
      percentage: BigInt(c.percentage) * BigInt(10) ** BigInt(22),
    }));
    
    const splitId = await contract.create_split({
      repo_url: params.repoUrl,
      owner: params.owner,
    });
    
    await contract.update_split({
      split_id: splitId,
      contributors: formattedContributors,
    });
    
    return {
      id: splitId,
      repoUrl: params.repoUrl,
      contributors: params.contributors,
    };
  },
  
  async getVerifiedWallet(githubUsername: string) {
    await initNear();
    
    if (useMockMode) {
      const wallets: Record<string, string> = {
        'alice': 'alice.near',
        'bob': 'bob.near',
        'charlie': 'charlie.near',
        'dave': 'dave.near',
      };
      return wallets[githubUsername] || null;
    }
    
    return await contract.get_wallet_address({ github_username: githubUsername });
  },
  
  async storePendingVerification(params: any) {
    await initNear();
    
    if (useMockMode) {
      return { success: true };
    }
    
    return await contract.store_pending_verification({
      github_username: params.githubUsername,
      farcaster_id: params.farcasterId,
      code: params.code,
      expires_at: params.expiresAt,
    });
  },

  async probeConnection(repoUrl: string) {
    await initNear();

    if (useMockMode) {
      if (isProductionMode) {
        throw new Error('[NEAR] Probe failed: tool is still in mock mode.');
      }
      return { ok: true, mock: true };
    }

    return {
      ok: true,
      contractId: process.env.NEAR_CONTRACT_ID,
      network: 'mainnet',
      checkedRepo: repoUrl,
    };
  },
};
