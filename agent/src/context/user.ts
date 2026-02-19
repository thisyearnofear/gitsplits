/**
 * User Context Management
 * 
 * Maintains conversation state and user preferences.
 */

interface UserData {
  farcasterId: string;
  githubUsername?: string;
  walletAddress?: string;
  executionMode?: 'advisor' | 'draft' | 'execute';
  experienceMode?: 'guided' | 'hands_off';
  lastAnalysis?: {
    repoUrl: string;
    contributors: any[];
    timestamp: number;
  };
  lastSplit?: {
    id: string;
    repoUrl: string;
    createdAt: number;
  };
  lastPayment?: {
    splitId: string;
    amount: number;
    token: string;
    txHash: string;
    timestamp: number;
  };
  pendingVerification?: {
    githubUsername: string;
    code: string;
    expiresAt: number;
  };
  pendingPlan?: {
    id: string;
    intent: string;
    params: Record<string, any>;
    createdAt: number;
    expiresAt: number;
    confidence: number;
  };
  repoMemory?: Record<
    string,
    {
      lastAnalysisHash?: string;
      lastSplitId?: string;
      lastCoverage?: {
        verified: number;
        total: number;
      };
      lastPaymentAt?: number;
      lastPaymentTx?: string;
      updatedAt: number;
    }
  >;
}

// Simple in-memory storage (replace with Redis/DB in production)
const userStore = new Map<string, UserData>();

export class UserContext {
  async get(farcasterId: string): Promise<UserData> {
    const existing = userStore.get(farcasterId);
    if (existing) {
      return existing;
    }
    
    // Create new user context
    const newUser: UserData = {
      farcasterId,
      executionMode: 'execute',
      experienceMode: 'guided',
      repoMemory: {},
    };
    
    userStore.set(farcasterId, newUser);
    return newUser;
  }
  
  async update(farcasterId: string, data: Partial<UserData>): Promise<UserData> {
    const existing = await this.get(farcasterId);
    const updated = { ...existing, ...data };
    userStore.set(farcasterId, updated);
    return updated;
  }
  
  async clear(farcasterId: string): Promise<void> {
    userStore.delete(farcasterId);
  }

  async updateRepoMemory(
    farcasterId: string,
    repoUrl: string,
    patch: Partial<NonNullable<UserData['repoMemory']>[string]>
  ): Promise<void> {
    const existing = await this.get(farcasterId);
    const key = String(repoUrl || '').toLowerCase();
    const current = existing.repoMemory?.[key] || { updatedAt: Date.now() };
    const next = {
      ...current,
      ...patch,
      updatedAt: Date.now(),
    };
    const repoMemory = {
      ...(existing.repoMemory || {}),
      [key]: next,
    };

    await this.update(farcasterId, { repoMemory });
  }
}
