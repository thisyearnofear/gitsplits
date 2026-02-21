/**
 * Lightweight Intent-Based Agent Framework
 *
 * A minimal framework for building intent-based AI agents.
 * Shared between the Controller (Brain) and Worker (Muscle) for architectural consistency.
 */

export interface Intent {
  name: string;
  patterns: RegExp[];
  extractParams: (matches: RegExpMatchArray) => Record<string, any>;
  validate?: (params: Record<string, any>) => { valid: boolean; error?: string };
  execute: (params: Record<string, any>, context: any, tools: any) => Promise<IntentResult>;
}

export interface IntentResult {
  response: string;
  context?: any;
}

export interface Tool {
  name: string;
  [key: string]: any;
}

/**
 * Registry for agent tools with flexible accessors.
 */
export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  register(tool: Tool) {
    this.tools.set(tool.name, tool);
  }

  get(name: string): Tool {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }
    return tool;
  }

  /**
   * Safe access to tools by name.
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  // Dynamic accessors for common tools
  get github() { return this.get('github'); }
  get near() { return this.get('near'); }
  get pingpay() { return this.get('pingpay'); }
  get hotpay() { return this.get('hotpay'); }
  get eigenai() { return this.get('eigenai'); }
  get teeWallet() { return this.get('tee-wallet'); }
  get paymentOrchestrator() { return this.get('payment-orchestrator'); }
  get reputation() { return this.get('reputation'); }
  get workerClient() { return this.get('worker-client'); }
}

/**
 * Core Agent logic responsible for parsing and executing intents.
 */
export class Agent {
  private intents: Intent[] = [];
  private tools: ToolRegistry = new ToolRegistry();

  registerIntent(intent: Intent) {
    this.intents.push(intent);
  }

  registerTool(tool: Tool) {
    this.tools.register(tool);
  }

  async parseIntent(text: string, context?: any): Promise<{ intent: Intent; params: Record<string, any> } | null> {
    const detailed = await this.parseIntentDetailed(text, context);
    if (!detailed) return null;
    return { intent: detailed.intent, params: detailed.params };
  }

  async parseIntentDetailed(
    text: string,
    _context?: any
  ): Promise<{ intent: Intent; params: Record<string, any>; confidence: number; matchedText: string } | null> {
    const normalizedText = String(text || '').trim();
    if (!normalizedText) return null;

    for (const intent of this.intents) {
      for (const pattern of intent.patterns) {
        const match = normalizedText.match(pattern);
        if (match) {
          const params = intent.extractParams(match);
          const matchedText = match[0] || '';

          // Calculate confidence based on coverage of the original string
          const lengthScore = matchedText.length / normalizedText.length;
          const prefixScore = normalizedText.toLowerCase().startsWith(intent.name.toLowerCase()) ? 0.2 : 0;
          const confidence = Math.max(0, Math.min(1, 0.4 + lengthScore * 0.6 + prefixScore));

          return { intent, params, confidence, matchedText };
        }
      }
    }
    return null;
  }

  async execute(
    intent: Intent,
    params: Record<string, any>,
    context: any
  ): Promise<IntentResult> {
    // Validate if validator exists
    if (intent.validate) {
      const validation = intent.validate(params);
      if (!validation.valid) {
        return {
          response: `❌ ${validation.error}`,
          context,
        };
      }
    }

    // Execute the intent using the registered tools
    return await intent.execute(params, context, this.tools);
  }

  getTools(): ToolRegistry {
    return this.tools;
  }

  getIntentByName(name: string): Intent | null {
    return this.intents.find((intent) => intent.name === name) || null;
  }
}
