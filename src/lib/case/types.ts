/**
 * Single source of truth for the OSS Funding case state machine.
 *
 * Mirrors docs/maestro/case-definition.yaml so the demo UI shows exactly
 * what a real Maestro case timeline would show. Stage keys match the YAML.
 */

export type StageKey =
  | "intake"
  | "repo_analysis"
  | "verification_check"
  | "compliance_approval"
  | "split_creation"
  | "payout_execution"
  | "reconciliation"
  | "closure";

export type StageStatus = "pending" | "running" | "complete" | "blocked" | "skipped";

export type Actor =
  | "agent_builder"
  | "external_agent"
  | "api_workflow"
  | "action_center"
  | "system";

export type AutonomyTier = "T0" | "T1" | "T2" | "T3";

export type Stage = {
  key: StageKey;
  title: string;
  status: StageStatus;
  actors: Actor[];
  startedAt?: string;
  completedAt?: string;
  summary?: string;
  detail?: Record<string, unknown>;
};

export type RiskFlag = {
  code: string;
  severity: "info" | "warning" | "blocker";
  message: string;
};

export type ContributorRec = {
  github_username: string;
  percentage: number;
  rationale: string;
  credit_action: "full_credit" | "partial_credit" | "no_credit" | "flag_for_review";
};

export type Attestation = {
  payload: string;
  signature: string;
  signer: string;
  isTee: boolean;
  insightExplorerUrl?: string | null;
};

export type CaseState = {
  id: string;
  status: "running" | "completed" | "rejected" | "blocked";
  createdAt: string;
  updatedAt: string;
  sponsor: {
    id: string;
    email: string;
    context?: string;
  };
  request: {
    repoUrl: string;
    amount: number;
    token: string;
  };
  autonomyTier?: AutonomyTier;
  autonomyReasoning?: string;
  recommendation?: ContributorRec[];
  riskFlags?: RiskFlag[];
  sponsorSummary?: string;
  insightConfidence?: number;
  splitId?: string;
  payout?: {
    txHash: string;
    engine: string;
    protocol: string;
    distributedAmount: number;
    recipientCount: number;
  };
  pendingClaims?: number;
  attestation?: Attestation;
  stages: Stage[];
};

export const STAGE_BLUEPRINT: ReadonlyArray<{
  key: StageKey;
  title: string;
  actors: Actor[];
}> = [
  { key: "intake", title: "Intake", actors: ["agent_builder"] },
  { key: "repo_analysis", title: "Repo Analysis", actors: ["api_workflow", "external_agent"] },
  { key: "verification_check", title: "Verification Check", actors: ["api_workflow", "action_center"] },
  { key: "compliance_approval", title: "Compliance & Approval", actors: ["api_workflow", "agent_builder", "action_center"] },
  { key: "split_creation", title: "Split Creation", actors: ["api_workflow"] },
  { key: "payout_execution", title: "Payout Execution", actors: ["api_workflow"] },
  { key: "reconciliation", title: "Reconciliation & Attestation", actors: ["api_workflow", "system"] },
  { key: "closure", title: "Closure", actors: ["system"] },
];

export const ACTOR_LABEL: Record<Actor, string> = {
  agent_builder: "UiPath Agent Builder",
  external_agent: "LangChain (External)",
  api_workflow: "UiPath API Workflow",
  action_center: "UiPath Action Center",
  system: "Maestro / TEE",
};

export type CaseCreateRequest = {
  repoUrl: string;
  amount: number;
  token?: string;
  sponsorEmail: string;
  sponsorContext?: string;
};
