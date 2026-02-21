/**
 * Farcaster Integration
 *
 * Connects the GitSplits agent to Farcaster for listening to mentions and DMs.
 * Uses the Neynar API for Farcaster interactions.
 */

import { GitSplitsController } from '../agent';

interface FarcasterConfig {
  apiKey: string;
  signerUuid: string;
  botFid: number;
  webhookSecret?: string;
}

interface Cast {
  hash: string;
  text: string;
  author: {
    fid: number;
    username: string;
    display_name: string;
  };
  timestamp: string;
  parent_hash?: string;
  mentioned_profiles?: Array<{
    fid: number;
    username: string;
  }>;
}

export class FarcasterClient {
  private config: FarcasterConfig;
  private isRunning: boolean = false;
  private lastCheckedTimestamp: number = Date.now();
  private pollInterval: NodeJS.Timeout | null = null;
  private controller: GitSplitsController;

  constructor(config: FarcasterConfig) {
    this.config = config;

    // Initialize controller for Farcaster requests
    this.controller = new GitSplitsController({
      nearAccountId: process.env.NEAR_ACCOUNT_ID || '',
      nearPrivateKey: process.env.NEAR_PRIVATE_KEY || '',
      nearNetworkId: (process.env.NEAR_NETWORK_ID as 'mainnet' | 'testnet') || 'testnet',
    });
    // Note: in a fully wired system, we would await controller.initialize()
    this.controller.initialize().catch(console.error);
  }

  /**
   * Start listening for mentions and DMs
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ Farcaster client already running');
      return;
    }

    console.log('🚀 Starting Farcaster client...');
    console.log(`   Bot FID: ${this.config.botFid}`);

    this.isRunning = true;

    // Start polling for mentions
    this.pollInterval = setInterval(() => {
      this.pollMentions();
    }, 30000); // Poll every 30 seconds

    // Do an initial poll
    await this.pollMentions();

    console.log('✅ Farcaster client started');
  }

  /**
   * Stop listening
   */
  stop(): void {
    this.isRunning = false;
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    console.log('🛑 Farcaster client stopped');
  }

  /**
   * Poll for new mentions of the bot
   */
  private async pollMentions(): Promise<void> {
    if (!this.isRunning) return;

    try {
      // Fetch mentions using Neynar API
      const response = await fetch(
        `https://api.neynar.com/v2/farcaster/notifications?fid=${this.config.botFid}&type=mentions`,
        {
          headers: {
            'Accept': 'application/json',
            'api_key': this.config.apiKey,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Neynar API error: ${response.status}`);
      }

      const data = await response.json() as { notifications?: any[] };
      const notifications = data.notifications || [];

      // Process new mentions
      for (const notification of notifications) {
        const cast = notification.cast;

        // Skip if we've already processed this cast
        const castTimestamp = new Date(cast.timestamp).getTime();
        if (castTimestamp <= this.lastCheckedTimestamp) {
          continue;
        }

        // Check if the bot is mentioned
        const isMentioned = cast.mentioned_profiles?.some(
          (profile: any) => profile.fid === this.config.botFid
        );

        if (isMentioned) {
          await this.handleMention(cast);
        }
      }

      // Update last checked timestamp
      this.lastCheckedTimestamp = Date.now();
    } catch (error) {
      console.error('❌ Error polling mentions:', error);
    }
  }

  /**
   * Handle a mention
   */
  private async handleMention(cast: Cast): Promise<void> {
    console.log(`📨 Mention from @${cast.author.username}: ${cast.text.substring(0, 50)}...`);

    try {
      // Process the message through the agent
      const response = await this.controller.handleUserRequest({
        text: cast.text,
        author: cast.author.fid.toString(),
        type: 'cast',
      });

      // Reply to the cast
      await this.replyToCast(cast.hash, response);
    } catch (error) {
      console.error('❌ Error handling mention:', error);
      await this.replyToCast(
        cast.hash,
        '❌ Sorry, something went wrong. Please try again later.'
      );
    }
  }

  /**
   * Reply to a cast
   */
  private async replyToCast(parentHash: string, text: string): Promise<void> {
    try {
      // Truncate text if too long (Farcaster limit is 320 characters)
      const truncatedText = text.length > 300 ? text.substring(0, 297) + '...' : text;

      const response = await fetch('https://api.neynar.com/v2/farcaster/cast', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'api_key': this.config.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          signer_uuid: this.config.signerUuid,
          text: truncatedText,
          parent: parentHash,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to reply: ${error}`);
      }

      console.log(`✅ Replied to cast ${parentHash.substring(0, 10)}...`);
    } catch (error) {
      console.error('❌ Error replying to cast:', error);
    }
  }

  /**
   * Publish a new cast (for announcements)
   */
  async publishCast(text: string): Promise<void> {
    try {
      const truncatedText = text.length > 300 ? text.substring(0, 297) + '...' : text;

      const response = await fetch('https://api.neynar.com/v2/farcaster/cast', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'api_key': this.config.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          signer_uuid: this.config.signerUuid,
          text: truncatedText,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to publish cast: ${error}`);
      }

      console.log('✅ Published cast');
    } catch (error) {
      console.error('❌ Error publishing cast:', error);
    }
  }

  /**
   * Get bot profile info
   */
  async getBotProfile(): Promise<any> {
    try {
      const response = await fetch(
        `https://api.neynar.com/v2/farcaster/user/bulk?fids=${this.config.botFid}`,
        {
          headers: {
            'Accept': 'application/json',
            'api_key': this.config.apiKey,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to get profile: ${response.status}`);
      }

      const data = await response.json() as { users?: any[] };
      return data.users?.[0];
    } catch (error) {
      console.error('❌ Error getting bot profile:', error);
      return null;
    }
  }
}

/**
 * Create and configure Farcaster client from environment variables
 */
export function createFarcasterClient(): FarcasterClient | null {
  const apiKey = process.env.NEYNAR_API_KEY;
  const signerUuid = process.env.NEYNAR_SIGNER_UUID;
  const botFid = process.env.FARCASTER_BOT_FID;

  if (!apiKey || !signerUuid || !botFid) {
    console.log('⚠️ Farcaster configuration missing. Set NEYNAR_API_KEY, NEYNAR_SIGNER_UUID, and FARCASTER_BOT_FID');
    return null;
  }

  return new FarcasterClient({
    apiKey,
    signerUuid,
    botFid: parseInt(botFid, 10),
    webhookSecret: process.env.FARCASTER_WEBHOOK_SECRET,
  });
}
