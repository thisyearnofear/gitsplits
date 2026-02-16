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
import { UserContext } from './context/user';
import { githubTool } from './tools/github';
import { nearTool } from './tools/near';
import { pingpayTool } from './tools/pingpay';

// Validate required environment variables
const requiredEnv = [
  'GITHUB_APP_ID',
  'GITHUB_PRIVATE_KEY',
  'NEAR_ACCOUNT_ID',
  'NEAR_PRIVATE_KEY',
  'NEAR_CONTRACT_ID',
  'PING_PAY_API_KEY',
];

const missing = requiredEnv.filter(key => !process.env[key]);

if (missing.length > 0) {
  console.error('❌ Missing required environment variables:');
  missing.forEach(key => console.error(`   - ${key}`));
  console.error('');
  console.error('Set all required variables in .env file');
  // Don't exit - let it fail when actually called
}

// Initialize agent
const agent = new Agent();

// Register intents
agent.registerIntent(payIntent);
agent.registerIntent(createIntent);
agent.registerIntent(analyzeIntent);
agent.registerIntent(verifyIntent);

// Register tools
agent.registerTool(githubTool);
agent.registerTool(nearTool);
agent.registerTool(pingpayTool);

// User context management
const userContext = new UserContext();

/**
 * Process incoming message
 */
export async function processMessage(
  message: { text: string; author: string; type: 'cast' | 'dm' | 'web' }
): Promise<string> {
  // Get or create user context
  const context = await userContext.get(message.author);
  
  // Parse intent
  const parsed = await agent.parseIntent(message.text, context);
  
  if (!parsed) {
    return "I didn't understand that. Try: 'analyze near/near-sdk-rs' or 'pay 100 USDC to near/near-sdk-rs'";
  }
  
  console.log(`[Agent] Parsed intent: ${parsed.intent.name}`, parsed.params);
  
  // Execute the intent
  const result = await agent.execute(parsed.intent, parsed.params, {
    ...context,
    message,
  });
  
  // Update user context
  if (result.context) {
    await userContext.update(message.author, result.context);
  }
  
  return result.response;
}

// Export for use by web UI and Farcaster
export { agent };
