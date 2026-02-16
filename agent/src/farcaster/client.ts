/**
 * Farcaster Client
 * 
 * Lightweight Farcaster integration for the GitSplits agent.
 * Based on farcaster-agent patterns but simplified for our use case.
 */

import { getInsecureHubRpcClient, Message } from '@farcaster/hub-nodejs';
import { Wallet } from 'ethers';

interface FarcasterConfig {
  privateKey: string;
  signerKey?: string;
  fid?: number;
  hubUrl?: string;
}

interface Cast {
  hash: string;
  text: string;
  author: string;
  authorFid: number;
  timestamp: number;
}

interface DM {
  text: string;
  author: string;
  authorFid: number;
  timestamp: number;
}

export class FarcasterClient {
  private wallet: Wallet;
  private signerKey?: string;
  private fid?: number;
  private hubClient: any;
  private listeners: Map<string, Function[]> = new Map();
  private pollingInterval?: NodeJS.Timeout;
  
  constructor(config: FarcasterConfig) {
    this.wallet = new Wallet(config.privateKey);
    this.signerKey = config.signerKey;
    this.fid = config.fid;
    this.hubClient = getInsecureHubRpcClient(config.hubUrl || 'hub-api.neynar.com:443');
  }
  
  /**
   * Connect to Farcaster and start listening
   */
  async connect(): Promise<void> {
    console.log('🔌 Connecting to Farcaster...');
    
    // If no FID, we need to register (auto-setup mode)
    if (!this.fid) {
      console.log('📝 No FID found. Auto-registration will be performed on first cast.');
    } else {
      console.log(`✅ Connected with FID: ${this.fid}`);
    }
    
    // Start polling for mentions
    this.startPolling();
  }
  
  /**
   * Start polling for mentions and DMs
   */
  private startPolling(): void {
    // Poll every 30 seconds
    this.pollingInterval = setInterval(async () => {
      await this.checkMentions();
    }, 30000);
    
    console.log('👂 Listening for mentions (polling every 30s)');
  }
  
  /**
   * Check for new mentions
   */
  private async checkMentions(): Promise<void> {
    // This is a simplified implementation
    // In production, you'd use Neynar API or hub events
    try {
      // TODO: Implement actual mention checking via Neynar API
      // For now, this is a placeholder
    } catch (error) {
      console.error('Error checking mentions:', error);
    }
  }
  
  /**
   * Post a reply to a cast
   */
  async reply(parentHash: string, text: string): Promise<string> {
    console.log(`💬 Replying to ${parentHash}: ${text.substring(0, 50)}...`);
    
    // TODO: Implement actual cast posting via Neynar or hub
    // For now, return mock hash
    return `0x${Math.random().toString(36).substring(2, 34)}`;
  }
  
  /**
   * Send a DM
   */
  async sendDM(recipientFid: string, text: string): Promise<void> {
    console.log(`📨 Sending DM to ${recipientFid}: ${text.substring(0, 50)}...`);
    
    // TODO: Implement actual DM sending
    // DMs require special handling on Farcaster
  }
  
  /**
   * Post a new cast
   */
  async postCast(text: string): Promise<string> {
    console.log(`📝 Posting cast: ${text.substring(0, 50)}...`);
    
    // TODO: Implement actual cast posting
    return `0x${Math.random().toString(36).substring(2, 34)}`;
  }
  
  /**
   * Register event listener
   */
  on(event: 'mention' | 'dm', handler: (data: any) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(handler);
  }
  
  /**
   * Emit event to listeners
   */
  private emit(event: string, data: any): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }
  
  /**
   * Disconnect from Farcaster
   */
  disconnect(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
    console.log('👋 Disconnected from Farcaster');
  }
}
