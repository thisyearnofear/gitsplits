export type ExecutionMode = 'advisor' | 'draft' | 'execute';

export interface ActionPlan {
  id: string;
  intent: string;
  params: Record<string, any>;
  dependencies: string[];
  risks: string[];
  outputs: string[];
  createdAt: number;
  expiresAt: number;
  confidence: number;
}

export interface PolicyDecision {
  allowed: boolean;
  reasons: string[];
  warnings: string[];
}

export interface SafetyAlert {
  level: 'low' | 'medium' | 'high';
  code: string;
  message: string;
}

export interface ReplayableCommand {
  eventId: string;
  text: string;
  author: string;
  type: 'cast' | 'dm' | 'web';
  walletAddress?: string;
  nearAccountId?: string;
  evmAddress?: string;
  createdAt: number;
}
