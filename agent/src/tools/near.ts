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
let workerRegistrationChecked = false;

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
        'is_worker_registered',
        'is_github_verified',
        'get_wallet_address',
        'get_pending_distributions',
      ],
      changeMethods: [
        'register_worker',
        'create_split',
        'update_split',
        'store_verification',
        'store_pending_distribution',
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

function normalizeContributorPercentages(
  contributors: Array<{ github_username: string; percentage: number }>
) {
  if (contributors.length === 0) return contributors;

  const rounded = contributors.map((c) => ({
    github_username: c.github_username,
    percentage: Math.max(0, Math.round(c.percentage)),
  }));

  let total = rounded.reduce((sum, c) => sum + c.percentage, 0);
  if (total === 0) {
    rounded[0].percentage = 100;
    return rounded;
  }

  const target = 100;
  const diff = target - total;
  rounded[0].percentage += diff;
  if (rounded[0].percentage < 0) {
    rounded[0].percentage = 0;
  }

  total = rounded.reduce((sum, c) => sum + c.percentage, 0);
  if (total !== target) {
    rounded[0].percentage += target - total;
  }

  return rounded;
}

async function ensureWorkerRegistered() {
  if (workerRegistrationChecked || useMockMode || !contract) return;

  const accountId = process.env.NEAR_ACCOUNT_ID;
  if (!accountId) {
    if (isProductionMode) {
      throw new Error('[NEAR] NEAR_ACCOUNT_ID is required for worker registration.');
    }
    return;
  }

  const isRegistered = await contract.is_worker_registered({ account_id: accountId });
  if (isRegistered) {
    workerRegistrationChecked = true;
    return;
  }

  const workerCodeHash = process.env.NEAR_WORKER_CODE_HASH || 'gitsplits-agent';
  const attestation = {
    quote: process.env.NEAR_WORKER_QUOTE || 'local-attestation',
    endorsements: process.env.NEAR_WORKER_ENDORSEMENTS || 'local-endorsements',
  };

  await contract.register_worker({
    _attestation: attestation,
    code_hash: workerCodeHash,
  });

  workerRegistrationChecked = true;
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
    
    const split = await contract.get_split_by_repo({ repo_url: repoUrl });
    if (!split) return split;

    return {
      ...split,
      contributors: (split.contributors || []).map((c: any) => ({
        ...c,
        percentage: normalizeStoredPercentage(c.percentage),
      })),
    };
  },
  
  async createSplit(params: {
    repoUrl: string;
    owner: string;
    contributors: Array<{ github_username: string; percentage: number }>;
  }) {
    await initNear();
    await ensureWorkerRegistered();
    
    if (useMockMode) {
      return {
        id: `split-${Date.now()}`,
        repoUrl: params.repoUrl,
        contributors: params.contributors,
      };
    }
    
    const normalized = normalizeContributorPercentages(params.contributors);
    const formattedContributors = normalized.map((c) => ({
      github_username: c.github_username,
      percentage: (BigInt(c.percentage) * BigInt(10) ** BigInt(22)).toString(),
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
      contributors: normalized,
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

  async getPendingDistributions(githubUsername: string) {
    await initNear();

    if (useMockMode) {
      return [];
    }

    return await contract.get_pending_distributions({ github_username: githubUsername });
  },
  
  async storePendingVerification(params: any) {
    await initNear();
    await ensureWorkerRegistered();
    
    if (useMockMode) {
      return { success: true };
    }

    return {
      success: true,
      note: 'Pending verification is managed off-chain in this version.',
      githubUsername: params.githubUsername,
      farcasterId: params.farcasterId,
      expiresAt: params.expiresAt,
    };
  },

  async storePendingDistribution(params: {
    githubUsername: string;
    amount: number;
    token: string;
  }) {
    await initNear();
    await ensureWorkerRegistered();

    if (useMockMode) {
      return `pending-${params.githubUsername}-${Date.now()}`;
    }

    const yoctoAmount = BigInt(Math.round(params.amount * 1_000_000)).toString();
    return await contract.store_pending_distribution({
      github_username: params.githubUsername,
      amount: yoctoAmount,
      token: params.token,
    });
  },

  async storeVerification(params: {
    githubUsername: string;
    walletAddress: string;
    xUsername?: string;
  }) {
    await initNear();
    await ensureWorkerRegistered();

    if (useMockMode) {
      return { success: true, mock: true };
    }

    return await contract.store_verification({
      github_username: params.githubUsername,
      x_username: params.xUsername || 'web',
      wallet_address: params.walletAddress,
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

function normalizeStoredPercentage(value: string | number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  if (numeric <= 100) return numeric;
  return numeric / 1e22;
}
