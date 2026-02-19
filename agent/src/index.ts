/**
 * GitSplits Agent
 * 
 * Autonomous agent for compensating open source contributors.
 * Exports processMessage for use by web UI and Farcaster.
 */

import dotenv from 'dotenv';
dotenv.config();

import { Agent } from './core/agent';
import { payIntent } from './intents/pay';
import { createIntent } from './intents/create';
import { analyzeIntent } from './intents/analyze';
import { verifyIntent } from './intents/verify';
import { pendingIntent } from './intents/pending';
import { reputationIntent } from './intents/reputation';
import { UserContext } from './context/user';
import { githubTool } from './tools/github';
import { nearTool } from './tools/near';
import { pingpayTool } from './tools/pingpay';
import { hotpayTool } from './tools/hotpay';
import { eigenaiTool } from './tools/eigenai';
import { teeWalletTool } from './tools/tee-wallet';
import { reputationTool } from './tools/reputation';
import { validateRuntimeConfig } from './config';
import { paymentOrchestratorTool } from './agentic/payment-orchestrator';
import { createActionPlan, formatPlanForUser } from './agentic/planner';
import { evaluatePolicy, requiresApproval } from './agentic/policy';
import { createEventId, getReplayableCommand, logEvent, registerReplayableCommand } from './agentic/telemetry';
import { assistIntent, formatAssistedSuggestion } from './agentic/intent-assistant';
import crypto from 'crypto';

const runtimeValidation = validateRuntimeConfig();
if (runtimeValidation.warnings.length > 0) {
  console.warn('⚠️ Runtime configuration warnings:');
  runtimeValidation.warnings.forEach((warning) => console.warn(`   - ${warning}`));
}
if (runtimeValidation.errors.length > 0) {
  console.error('❌ Runtime configuration errors:');
  runtimeValidation.errors.forEach((error) => console.error(`   - ${error}`));
  if (runtimeValidation.isProduction) {
    throw new Error('Invalid production runtime configuration.');
  }
}

// Initialize agent
const agent = new Agent();

// Register intents
agent.registerIntent(payIntent);
agent.registerIntent(createIntent);
agent.registerIntent(analyzeIntent);
agent.registerIntent(verifyIntent);
agent.registerIntent(pendingIntent);
agent.registerIntent(reputationIntent);

// Register tools
agent.registerTool(githubTool);
agent.registerTool(nearTool);
agent.registerTool(pingpayTool);
agent.registerTool(hotpayTool);
agent.registerTool(eigenaiTool);
agent.registerTool(teeWalletTool);
agent.registerTool(paymentOrchestratorTool);
agent.registerTool(reputationTool);

// User context management
const userContext = new UserContext();

/**
 * Process incoming message
 */
export async function processMessage(
  message: {
    text: string;
    author: string;
    type: 'cast' | 'dm' | 'web';
    walletAddress?: string;
    nearAccountId?: string;
    evmAddress?: string;
  }
): Promise<string> {
  const eventId = createEventId();
  logEvent({
    eventId,
    type: 'message_received',
    author: message.author,
    channel: message.type,
    text: message.text,
  });

  // Get or create user context
  const context = await userContext.get(message.author);
  const normalizedText = String(message.text || '').trim();
  const lowerText = normalizedText.toLowerCase();
  const executionMode = context.executionMode || (process.env.AGENT_DEFAULT_EXEC_MODE as any) || 'execute';
  const experienceMode = context.experienceMode || 'guided';

  const modeMatch = lowerText.match(/^(?:set\s+mode|mode)\s+(advisor|draft|execute)$/i);
  if (modeMatch) {
    const nextMode = modeMatch[1].toLowerCase();
    await userContext.update(message.author, {
      executionMode: nextMode as any,
      pendingPlan: undefined,
    });
    logEvent({ eventId, type: 'mode_changed', author: message.author, nextMode });
    return `✅ Execution mode set to ${nextMode}.`;
  }

  const experienceMatch = lowerText.match(/^(?:set\s+experience|experience)\s+(guided|hands[_ -]?off)$/i);
  if (experienceMatch) {
    const nextExperience = experienceMatch[1].replace(/[_ ]/g, '-').toLowerCase() === 'guided' ? 'guided' : 'hands_off';
    await userContext.update(message.author, {
      experienceMode: nextExperience as any,
    });
    logEvent({ eventId, type: 'experience_mode_changed', author: message.author, nextExperience });
    return `✅ Experience mode set to ${nextExperience}.`;
  }

  if (lowerText === 'cancel') {
    await userContext.update(message.author, { pendingPlan: undefined });
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
    const replayResponse = await processMessage({
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
      await userContext.update(message.author, { pendingPlan: undefined });
      return `Plan ${planId} expired. Request a fresh plan.`;
    }
    const intent = agent.getIntentByName(context.pendingPlan.intent);
    if (!intent) {
      await userContext.update(message.author, { pendingPlan: undefined });
      return `Cannot execute plan ${planId}: intent ${context.pendingPlan.intent} no longer available.`;
    }

    const result = await agent.execute(intent, context.pendingPlan.params, {
      ...context,
      message,
      approvedPlanId: planId,
      executionMode: 'execute',
    });

    await userContext.update(message.author, {
      ...result.context,
      pendingPlan: undefined,
    });
    logEvent({ eventId, type: 'plan_executed', planId, intent: intent.name, author: message.author });
    return result.response;
  }
  
  // Parse intent
  let parsed = await agent.parseIntentDetailed(message.text, context);
  
  if (!parsed) {
    if (experienceMode === 'hands_off') {
      const assisted = await assistIntent(message.text);
      if (assisted) {
        const assistedIntent = agent.getIntentByName(assisted.intentName);
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
      return "I didn't understand that. Try: 'analyze near/near-sdk-rs', 'pay 100 USDC to near/near-sdk-rs', or 'pending near/near-sdk-rs'";
    }
  }

  if (parsed.confidence < Number(process.env.AGENT_MIN_PARSE_CONFIDENCE || '0.45')) {
    if (experienceMode === 'hands_off') {
      const assisted = await assistIntent(message.text);
      if (assisted) {
        const assistedIntent = agent.getIntentByName(assisted.intentName);
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

    await userContext.update(message.author, {
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
  const result = await agent.execute(parsed.intent, parsed.params, {
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
    await userContext.update(message.author, result.context);
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
    await userContext.updateRepoMemory(message.author, memoryRepo, {
      lastAnalysisHash: analysisHash,
      lastSplitId: result.context?.lastSplit?.id || context?.lastSplit?.id,
      lastPaymentAt: result.context?.lastPayment?.timestamp,
      lastPaymentTx: result.context?.lastPayment?.txHash,
    });
  }
  
  return result.response;
}

// Export for use by web UI and Farcaster
export { agent };
