import crypto from 'crypto';
import {
  SignedContributionReport,
  AgentMessage,
  Agent,
} from '@gitsplits/shared';
import { connect, KeyPair, keyStores, Account } from 'near-api-js';
import { NearChainSignatures } from './tools/near-chain-sigs';

import { UserContext } from './context/user';
import { createActionPlan, formatPlanForUser } from './agentic/planner';
import { evaluatePolicy, requiresApproval } from './agentic/policy';
import { createEventId, getReplayableCommand, logEvent, registerReplayableCommand } from './agentic/telemetry';
import { assistIntent, formatAssistedSuggestion } from './agentic/intent-assistant';

import { analyzeIntent } from './intents/analyze';
import { createIntent } from './intents/create';
import { payIntent } from './intents/pay';
import { pendingIntent } from './intents/pending';
import { verifyIntent } from './intents/verify';
import { reputationIntent } from './intents/reputation';
import { nearTool } from './tools/near';
import { pingpayTool } from './tools/pingpay';
import { hotpayTool } from './tools/hotpay';
import { reputationTool } from './tools/reputation';
import { paymentOrchestratorTool } from './agentic/payment-orchestrator';
import { githubTool } from './tools/github';
import { eigenaiTool } from './tools/eigenai';
import { teeWalletTool } from './tools/tee-wallet';

export interface ControllerConfig {
  nearAccountId: string;
  nearPrivateKey: string;
  nearNetworkId: 'mainnet' | 'testnet';
}

/**
 * The Sovereign CEO Agent (Brain)
 * Runs on Phala Network (dstack)
 */
export class GitSplitsController {
  private agent: Agent;
  private config: ControllerConfig;
  private nearAccount?: Account;
  private userContext: UserContext;

  constructor(config: ControllerConfig) {
    this.userContext = new UserContext();
    this.config = config;
    this.agent = new Agent();

    // Register Intents
    this.registerIntents();
  }

  /**
   * Initialize the Sovereign Agent
   * Connects to NEAR and establishes identity
   */
  async initialize() {
    console.log(`[Controller] Initializing Sovereign Agent: ${this.config.nearAccountId}`);

    const keyStore = new keyStores.InMemoryKeyStore();
    const keyPair = KeyPair.fromString(this.config.nearPrivateKey);
    await keyStore.setKey(this.config.nearNetworkId, this.config.nearAccountId, keyPair);

    const near = await connect({
      networkId: this.config.nearNetworkId,
      nodeUrl: this.config.nearNetworkId === 'mainnet'
        ? 'https://rpc.mainnet.near.org'
        : 'https://rpc.testnet.near.org',
      keyStore,
    });

    this.nearAccount = await near.account(this.config.nearAccountId);

    // Register NEAR tool
    this.agent.registerTool({
      name: 'near',
      account: this.nearAccount,
      contractId: this.config.nearAccountId, // Defaulting to self for identity
    });

    const chainSignatures = new NearChainSignatures(this.nearAccount);
    this.agent.registerTool({
      name: 'chain-signatures',
      sign: (request: any) => chainSignatures.sign(request),
      deriveEvmAddress: (path: string) => chainSignatures.deriveEvmAddress(path),
    });

    // Register Sovereign Tools
    this.agent.registerTool(nearTool);
    this.agent.registerTool(pingpayTool);
    this.agent.registerTool(hotpayTool);
    this.agent.registerTool(reputationTool);
    this.agent.registerTool(paymentOrchestratorTool);
    this.agent.registerTool(githubTool);
    this.agent.registerTool(eigenaiTool);
    this.agent.registerTool(teeWalletTool);

    console.log('[Controller] Connected to NEAR successfully');
  }

  private registerIntents() {
    // Register Sovereign Intents
    this.agent.registerIntent(analyzeIntent);
    this.agent.registerIntent(createIntent);
    this.agent.registerIntent(payIntent);
    this.agent.registerIntent(pendingIntent);
    this.agent.registerIntent(verifyIntent);
    this.agent.registerIntent(reputationIntent);
  }

  /**
   * The main "Action Loop" for the Sovereign CEO
   */
  async handleUserRequest(message: AgentMessage): Promise<string> {
    const eventId = createEventId();
    logEvent({
      eventId,
      type: 'message_received',
      author: message.author,
      channel: message.type,
      text: message.text,
    });

    // Get or create user context
    const context = await this.userContext.get(message.author);
    const normalizedText = String(message.text || '').trim();
    const lowerText = normalizedText.toLowerCase();
    const executionMode = context.executionMode || (process.env.AGENT_DEFAULT_EXEC_MODE as any) || 'execute';
    const experienceMode = context.experienceMode || 'guided';

    const modeMatch = lowerText.match(/^(?:set\s+mode|mode)\s+(advisor|draft|execute)$/i);
    if (modeMatch) {
      const nextMode = modeMatch[1].toLowerCase();
      await this.userContext.update(message.author, {
        executionMode: nextMode as any,
        pendingPlan: undefined,
      });
      logEvent({ eventId, type: 'mode_changed', author: message.author, nextMode });
      return `✅ Execution mode set to ${nextMode}.`;
    }

    const experienceMatch = lowerText.match(/^(?:set\s+experience|experience)\s+(guided|hands[_ -]?off)$/i);
    if (experienceMatch) {
      const nextExperience = experienceMatch[1].replace(/[_ ]/g, '-').toLowerCase() === 'guided' ? 'guided' : 'hands_off';
      await this.userContext.update(message.author, {
        experienceMode: nextExperience as any,
      });
      logEvent({ eventId, type: 'experience_mode_changed', author: message.author, nextExperience });
      return `✅ Experience mode set to ${nextExperience}.`;
    }

    if (lowerText === 'cancel') {
      await this.userContext.update(message.author, { pendingPlan: undefined });
      logEvent({ eventId, type: 'plan_cancelled', author: message.author });
      return 'Cancelled pending plan.';
    }

    if (lowerText.startsWith('replay ')) {
      const replayId = normalizedText.split(/\s+/)[1] || '';
      const replayable = getReplayableCommand(replayId);
      if (!replayable) {
        return `Replay id not found: ${replayId}`;
      }
      if (Date.now() - replayable.createdAt > 24 * 60 * 60 * 1000) {
        return `Replay id expired: ${replayId}`;
      }
      logEvent({ eventId, type: 'replay_started', replayId, author: message.author });
      const replayResponse = await this.handleUserRequest({
        text: replayable.text,
        author: replayable.author,
        type: replayable.type,
        walletAddress: replayable.walletAddress,
        nearAccountId: replayable.nearAccountId,
        evmAddress: replayable.evmAddress,
      });
      return `🔁 Replay ${replayId}\n\n${replayResponse}`;
    }

    const approveMatch = lowerText.match(/^approve\s+(plan-[a-z0-9]+)/i) || (lowerText === 'approve' ? ['', context.pendingPlan?.id || ''] as any : null);
    if (approveMatch && context.pendingPlan) {
      const planId = String(approveMatch[1] || '').trim();
      if (!planId || planId !== context.pendingPlan.id) {
        return `Pending plan mismatch. Expected ${context.pendingPlan.id}.`;
      }
      if (Date.now() > context.pendingPlan.expiresAt) {
        await this.userContext.update(message.author, { pendingPlan: undefined });
        return `Plan ${planId} expired. Request a fresh plan.`;
      }
      const intent = this.agent.getIntentByName(context.pendingPlan.intent);
      if (!intent) {
        await this.userContext.update(message.author, { pendingPlan: undefined });
        return `Cannot execute plan ${planId}: intent ${context.pendingPlan.intent} no longer available.`;
      }

      const result = await this.agent.execute(intent, context.pendingPlan.params, {
        ...context,
        message,
        approvedPlanId: planId,
        executionMode: 'execute',
      });

      await this.userContext.update(message.author, {
        ...result.context,
        pendingPlan: undefined,
      });
      logEvent({ eventId, type: 'plan_executed', planId, intent: intent.name, author: message.author });
      return result.response;
    }

    // Parse intent
    let parsed = await this.agent.parseIntentDetailed(message.text, context);

    if (!parsed) {
      if (experienceMode === 'hands_off') {
        const assisted = await assistIntent(message.text);
        if (assisted) {
          const assistedIntent = this.agent.getIntentByName(assisted.intentName);
          if (!assistedIntent) {
            return formatAssistedSuggestion(assisted);
          }
          parsed = {
            intent: assistedIntent,
            params: assisted.params,
            confidence: assisted.confidence,
            matchedText: message.text,
          };
          logEvent({
            eventId,
            type: 'hands_off_assisted_parse',
            suggestedIntent: assisted.intentName,
            confidence: assisted.confidence,
            source: assisted.source,
          });
        }
      }
      if (!parsed) {
        return "I didn't understand that. Try: 'analyze near/near-sdk-rs'";
      }
    }

    if (parsed.confidence < Number(process.env.AGENT_MIN_PARSE_CONFIDENCE || '0.45')) {
      if (experienceMode === 'hands_off') {
        const assisted = await assistIntent(message.text);
        if (assisted) {
          const assistedIntent = this.agent.getIntentByName(assisted.intentName);
          if (assistedIntent && assisted.confidence >= Number(process.env.AGENT_HANDS_OFF_MIN_CONFIDENCE || '0.65')) {
            parsed = {
              intent: assistedIntent,
              params: assisted.params,
              confidence: assisted.confidence,
              matchedText: message.text,
            };
          } else {
            return formatAssistedSuggestion(assisted);
          }
        }
      }
    }

    if (parsed.confidence < Number(process.env.AGENT_MIN_PARSE_CONFIDENCE || '0.45')) {
      logEvent({
        eventId,
        type: 'intent_low_confidence',
        intent: parsed.intent.name,
        confidence: parsed.confidence,
        text: message.text,
      });
      return (
        `I may have misunderstood that (${parsed.intent.name}, confidence ${parsed.confidence.toFixed(2)}). ` +
        `Please confirm with a clearer command, e.g. "analyze owner/repo" or "pay 10 NEAR to owner/repo".`
      );
    }

    console.log(`[Agent] Parsed intent: ${parsed.intent.name}`, parsed.params, 'confidence=', parsed.confidence);
    registerReplayableCommand({
      eventId,
      text: message.text,
      author: message.author,
      type: message.type,
      walletAddress: message.walletAddress,
      nearAccountId: message.nearAccountId,
      evmAddress: message.evmAddress,
      createdAt: Date.now(),
    });

    const policy = evaluatePolicy({
      intentName: parsed.intent.name,
      params: parsed.params,
      mode: executionMode,
    });
    if (!policy.allowed) {
      logEvent({
        eventId,
        type: 'policy_block',
        intent: parsed.intent.name,
        reasons: policy.reasons,
      });
      return `🛑 Policy blocked ${parsed.intent.name}: ${policy.reasons.join(' | ')}`;
    }

    const isActionIntent = parsed.intent.name === 'create' || parsed.intent.name === 'pay';
    if (isActionIntent && (executionMode === 'advisor' || executionMode === 'draft' || requiresApproval(parsed.intent.name))) {
      const plan = createActionPlan({
        intent: parsed.intent.name,
        params: parsed.params,
        dependencies:
          parsed.intent.name === 'pay'
            ? ['split_exists', 'verified_recipients', 'payment_policy', 'wallet_or_rails_auth']
            : ['repo_analysis', 'near_connectivity', 'worker_registration'],
        risks: [
          ...(policy.warnings || []),
          ...(parsed.intent.name === 'pay' ? ['onchain_value_transfer'] : ['onchain_state_change']),
        ],
        outputs:
          parsed.intent.name === 'pay'
            ? ['tx_hash_or_intent_ref', 'coverage_summary', 'pending_claims']
            : ['split_id', 'allocation_preview', 'verification_coverage'],
        confidence: parsed.confidence,
      });

      await this.userContext.update(message.author, {
        pendingPlan: {
          id: plan.id,
          intent: plan.intent,
          params: plan.params,
          createdAt: plan.createdAt,
          expiresAt: plan.expiresAt,
          confidence: plan.confidence,
        },
        executionMode: executionMode as any,
      });
      logEvent({ eventId, type: 'plan_created', planId: plan.id, intent: parsed.intent.name, mode: executionMode });

      if (executionMode === 'advisor') {
        return `Advisor mode is active.\\n\\n${formatPlanForUser(plan)}`;
      }
      if (executionMode === 'draft') {
        return `Draft mode is active.\\n\\n${formatPlanForUser(plan)}`;
      }
      if (requiresApproval(parsed.intent.name)) {
        return formatPlanForUser(plan);
      }
    }

    // Execute the intent
    const result = await this.agent.execute(parsed.intent, parsed.params, {
      ...context,
      message,
      executionMode,
      experienceMode,
    });

    logEvent({
      eventId,
      type: 'intent_executed',
      intent: parsed.intent.name,
      confidence: parsed.confidence,
      mode: executionMode,
    });

    // Update user context
    if (result.context) {
      await this.userContext.update(message.author, result.context);
    }

    const memoryRepo =
      result.context?.lastAnalysis?.repoUrl ||
      result.context?.lastSplit?.repoUrl ||
      context?.lastAnalysis?.repoUrl ||
      null;
    if (memoryRepo) {
      const contributors = result.context?.lastAnalysis?.contributors || context?.lastAnalysis?.contributors || [];
      const analysisHash = contributors.length
        ? crypto.createHash('sha256').update(JSON.stringify(contributors)).digest('hex').slice(0, 16)
        : undefined;
      await this.userContext.updateRepoMemory(message.author, memoryRepo, {
        lastAnalysisHash: analysisHash,
        lastSplitId: result.context?.lastSplit?.id || context?.lastSplit?.id,
        lastPaymentAt: result.context?.lastPayment?.timestamp,
        lastPaymentTx: result.context?.lastPayment?.txHash,
      });
    }

    return result.response;
  }

  /**
   * Implementation of NEAR Chain Signatures
   * This allows the Phala-based agent to sign transactions for Ethereum/Base/etc.
   */
  async signCrossChainTransaction(payload: any, path: string) {
    if (!this.nearAccount) throw new Error('Controller not initialized');

    console.log(`[Controller] Requesting Chain Signature for path: ${path}`);
    const chainSigs = new NearChainSignatures(this.nearAccount);
    return await chainSigs.sign({ payload, path });
  }
}
