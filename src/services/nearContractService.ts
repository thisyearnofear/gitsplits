"use client";

import { providers, utils } from 'near-api-js';

// Contract configuration
const CONTRACT_ID = 'gitsplits-test.testnet';
const GAS_FOR_CALL = '300000000000000'; // 300 TGas
const GAS_FOR_NFT_APPROVE = '20000000000000'; // 20 TGas
const DEPOSIT = utils.format.parseNearAmount('0.01'); // 0.01 NEAR

export interface Attestation {
  quote: string;
  endorsements: string;
}

export interface Contributor {
  github_username: string;
  account_id?: string | null;
  percentage: string;
}

export interface Split {
  id: string;
  repo_url: string;
  owner: string;
  contributors: Contributor[];
  created_at: number;
  updated_at: number;
}

export interface ChainSignature {
  signature: string;
  public_key: string;
  chain_id: string;
}

export class NearContractService {
  private selector: any;
  private accountId: string | null;

  constructor(selector: any, accountId: string | null) {
    this.selector = selector;
    this.accountId = accountId;
  }

  private async getWallet() {
    if (!this.accountId) {
      throw new Error('Wallet not connected');
    }
    return await this.selector.wallet();
  }

  async isWorkerRegistered(accountId: string): Promise<boolean> {
    const wallet = await this.getWallet();
    const provider = new providers.JsonRpcProvider({ url: 'https://rpc.testnet.near.org' });
    
    try {
      const result = await provider.query({
        request_type: 'call_function',
        account_id: CONTRACT_ID,
        method_name: 'is_worker_registered',
        args_base64: Buffer.from(JSON.stringify({ account_id: accountId })).toString('base64'),
        finality: 'optimistic',
      });
      
      // @ts-ignore
      const data = JSON.parse(Buffer.from(result.result).toString());
      return data;
    } catch (error) {
      console.error('Error checking worker registration:', error);
      return false;
    }
  }

  async registerWorker(attestation: Attestation, codeHash: string): Promise<boolean> {
    try {
      const wallet = await this.getWallet();
      
      const result = await wallet.signAndSendTransaction({
        receiverId: CONTRACT_ID,
        actions: [
          {
            type: 'FunctionCall',
            params: {
              methodName: 'register_worker',
              args: {
                _attestation: attestation,
                code_hash: codeHash,
              },
              gas: GAS_FOR_CALL,
              deposit: '0',
            },
          },
        ],
      });
      
      return !!result;
    } catch (error) {
      console.error('Error registering worker:', error);
      throw error;
    }
  }

  async createSplit(repoUrl: string, owner: string): Promise<string> {
    try {
      const wallet = await this.getWallet();
      
      const result = await wallet.signAndSendTransaction({
        receiverId: CONTRACT_ID,
        actions: [
          {
            type: 'FunctionCall',
            params: {
              methodName: 'create_split',
              args: {
                repo_url: repoUrl,
                owner,
              },
              gas: GAS_FOR_CALL,
              deposit: '0',
            },
          },
        ],
      });
      
      // In a real implementation, you would parse the result to get the split ID
      // For now, we'll just return a placeholder
      return `split-${Date.now()}`;
    } catch (error) {
      console.error('Error creating split:', error);
      throw error;
    }
  }

  async updateSplit(splitId: string, contributors: Contributor[]): Promise<boolean> {
    try {
      const wallet = await this.getWallet();
      
      const result = await wallet.signAndSendTransaction({
        receiverId: CONTRACT_ID,
        actions: [
          {
            type: 'FunctionCall',
            params: {
              methodName: 'update_split',
              args: {
                split_id: splitId,
                contributors,
              },
              gas: GAS_FOR_CALL,
              deposit: '0',
            },
          },
        ],
      });
      
      return !!result;
    } catch (error) {
      console.error('Error updating split:', error);
      throw error;
    }
  }

  async getSplit(splitId: string): Promise<Split | null> {
    const provider = new providers.JsonRpcProvider({ url: 'https://rpc.testnet.near.org' });
    
    try {
      const result = await provider.query({
        request_type: 'call_function',
        account_id: CONTRACT_ID,
        method_name: 'get_split',
        args_base64: Buffer.from(JSON.stringify({ split_id: splitId })).toString('base64'),
        finality: 'optimistic',
      });
      
      // @ts-ignore
      const data = JSON.parse(Buffer.from(result.result).toString());
      return data;
    } catch (error) {
      console.error('Error getting split:', error);
      return null;
    }
  }

  async getSplitByRepo(repoUrl: string): Promise<Split | null> {
    const provider = new providers.JsonRpcProvider({ url: 'https://rpc.testnet.near.org' });
    
    try {
      const result = await provider.query({
        request_type: 'call_function',
        account_id: CONTRACT_ID,
        method_name: 'get_split_by_repo',
        args_base64: Buffer.from(JSON.stringify({ repo_url: repoUrl })).toString('base64'),
        finality: 'optimistic',
      });
      
      // @ts-ignore
      const data = JSON.parse(Buffer.from(result.result).toString());
      return data;
    } catch (error) {
      console.error('Error getting split by repo:', error);
      return null;
    }
  }

  async generateChainSignature(chainId: string, txData: string): Promise<ChainSignature> {
    try {
      const wallet = await this.getWallet();
      
      const result = await wallet.signAndSendTransaction({
        receiverId: CONTRACT_ID,
        actions: [
          {
            type: 'FunctionCall',
            params: {
              methodName: 'generate_chain_signature',
              args: {
                chain_id: chainId,
                _tx_data: txData,
              },
              gas: GAS_FOR_CALL,
              deposit: '0',
            },
          },
        ],
      });
      
      // In a real implementation, you would parse the result to get the signature
      // For now, we'll just return a placeholder
      return {
        signature: 'signature_placeholder',
        public_key: 'public_key_placeholder',
        chain_id: chainId,
      };
    } catch (error) {
      console.error('Error generating chain signature:', error);
      throw error;
    }
  }
}
