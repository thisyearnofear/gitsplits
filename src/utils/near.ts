import { KeyPair, keyStores, connect, utils, Account } from 'near-api-js';
import { twitterClient } from './twitter';

// Interface for contract connection
interface ContractConnection {
  account: Account;
  contractId: string;
}

// Cache for the contract connection
let contractConnectionCache: ContractConnection | null = null;

/**
 * Connect to the NEAR contract
 * In a real TEE environment, this would use the ephemeral key generated within the TEE
 */
export async function connectToNear(): Promise<ContractConnection> {
  // If we already have a connection, return it
  if (contractConnectionCache) {
    return contractConnectionCache;
  }

  // Get contract ID from environment variables
  const contractId = process.env.NEXT_PUBLIC_contractId;
  if (!contractId) {
    throw new Error('Contract ID is not defined in environment variables');
  }

  // In a real TEE implementation, this key would be generated within the TEE
  // and would never leave the secure enclave
  const keyPair = process.env.NEXT_PUBLIC_secretKey
    ? KeyPair.fromString(process.env.NEXT_PUBLIC_secretKey)
    : KeyPair.fromRandom('ed25519');

  // Connect to NEAR
  const keyStore = new keyStores.InMemoryKeyStore();
  const accountId = process.env.NEXT_PUBLIC_accountId || contractId;
  
  await keyStore.setKey('testnet', accountId, keyPair);

  const config = {
    networkId: 'testnet',
    keyStore,
    nodeUrl: 'https://rpc.testnet.near.org',
    walletUrl: 'https://wallet.testnet.near.org',
    helperUrl: 'https://helper.testnet.near.org',
    explorerUrl: 'https://explorer.testnet.near.org',
  };

  const near = await connect(config);
  const account = await near.account(accountId);

  // Cache the connection
  contractConnectionCache = { account, contractId };
  
  return contractConnectionCache;
}

/**
 * Call a view method on the contract
 */
export async function callViewMethod<T>(methodName: string, args: any = {}): Promise<T> {
  const { account, contractId } = await connectToNear();
  
  return account.viewFunction({
    contractId,
    methodName,
    args,
  });
}

/**
 * Call a change method on the contract
 */
export async function callChangeMethod(methodName: string, args: any = {}, gas: string = '300000000000000'): Promise<any> {
  const { account, contractId } = await connectToNear();
  
  const result = await account.functionCall({
    contractId,
    methodName,
    args,
    gas,
    attachedDeposit: '0',
  });
  
  // Parse the result
  if (result.status.SuccessValue) {
    try {
      return JSON.parse(Buffer.from(result.status.SuccessValue, 'base64').toString());
    } catch (e) {
      return Buffer.from(result.status.SuccessValue, 'base64').toString();
    }
  }
  
  return null;
}

/**
 * Process a Twitter command by calling the appropriate contract method
 */
export async function processTwitterCommand(command: string, args: any, tweetId: string, sender: string): Promise<{
  success: boolean;
  message: string;
  data?: any;
}> {
  try {
    switch (command.toLowerCase()) {
      case 'create':
        return await handleCreateCommand(args.repoUrl, sender, tweetId);
      
      case 'info':
        return await handleInfoCommand(args.repoUrl, tweetId);
      
      case 'distribute':
        return await handleDistributeCommand(args.repoUrl, args.amount, args.token || 'NEAR', sender, tweetId);
      
      case 'verify':
        return await handleVerifyCommand(args.githubUsername, sender, tweetId);
      
      default:
        return {
          success: false,
          message: `Unknown command: ${command}. Try '@bankrbot @gitsplits help' for a list of commands.`,
        };
    }
  } catch (error) {
    console.error(`Error processing command ${command}:`, error);
    return {
      success: false,
      message: `Error processing command: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Handle the create command
 */
async function handleCreateCommand(repoUrl: string, sender: string, tweetId: string): Promise<{
  success: boolean;
  message: string;
  data?: any;
}> {
  if (!repoUrl) {
    return {
      success: false,
      message: '❌ Missing repository URL. Usage: @bankrbot @gitsplits create github.com/user/repo',
    };
  }

  try {
    // Check if a split already exists for this repo
    const existingSplit = await callViewMethod('get_split_by_repo', { repo_url: repoUrl });
    
    if (existingSplit) {
      return {
        success: false,
        message: `❌ A split already exists for ${repoUrl}. Use '@bankrbot @gitsplits info ${repoUrl}' to view it.`,
      };
    }

    // Create the split
    const splitId = await callChangeMethod('create_split', {
      repo_url: repoUrl,
      owner: sender,
    });

    // For now, we'll return a success message
    // In a real implementation, we would fetch GitHub data and update the split with contributors
    return {
      success: true,
      message: `✅ Split created for ${repoUrl}!\n\nSplit ID: ${splitId}\n\nView details: https://gitsplits.example.com/splits/${splitId}`,
      data: { splitId },
    };
  } catch (error) {
    console.error('Error creating split:', error);
    return {
      success: false,
      message: `❌ Error creating split: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Handle the info command
 */
async function handleInfoCommand(repoUrl: string, tweetId: string): Promise<{
  success: boolean;
  message: string;
  data?: any;
}> {
  if (!repoUrl) {
    return {
      success: false,
      message: '❌ Missing repository URL. Usage: @bankrbot @gitsplits info github.com/user/repo',
    };
  }

  try {
    // Get the split
    const split = await callViewMethod('get_split_by_repo', { repo_url: repoUrl });
    
    if (!split) {
      return {
        success: false,
        message: `❌ No split found for ${repoUrl}. Use '@bankrbot @gitsplits create ${repoUrl}' to create one.`,
      };
    }

    // Get distribution history
    const distributionIds = await callViewMethod<string[]>('get_distribution_history', { split_id: split.id });
    
    // Format the message
    let message = `📊 Split info for ${repoUrl}:\n`;
    message += `Split ID: ${split.id}\n`;
    
    if (split.contributors && split.contributors.length > 0) {
      message += `\nTop contributors:\n`;
      
      // Sort contributors by percentage
      const sortedContributors = [...split.contributors].sort((a, b) => 
        BigInt(b.percentage) - BigInt(a.percentage)
      );
      
      // Take top 3 contributors
      const topContributors = sortedContributors.slice(0, 3);
      
      for (const contributor of topContributors) {
        // Convert percentage from yoctoNEAR format to human-readable percentage
        const percentage = (Number(contributor.percentage) / 1e24 * 100).toFixed(1);
        message += `- ${contributor.github_username}: ${percentage}%\n`;
      }
      
      if (sortedContributors.length > 3) {
        message += `...and ${sortedContributors.length - 3} more\n`;
      }
    } else {
      message += `\nNo contributors yet.\n`;
    }
    
    message += `\nTotal distributions: ${distributionIds.length}\n`;
    message += `View details: https://gitsplits.example.com/splits/${split.id}`;
    
    return {
      success: true,
      message,
      data: { split, distributionIds },
    };
  } catch (error) {
    console.error('Error getting split info:', error);
    return {
      success: false,
      message: `❌ Error getting split info: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Handle the distribute command
 */
async function handleDistributeCommand(
  repoUrl: string,
  amount: number,
  token: string,
  sender: string,
  tweetId: string
): Promise<{
  success: boolean;
  message: string;
  data?: any;
}> {
  if (!repoUrl) {
    return {
      success: false,
      message: '❌ Missing repository URL. Usage: @bankrbot @gitsplits distribute 100 NEAR to github.com/user/repo',
    };
  }

  if (!amount || amount <= 0) {
    return {
      success: false,
      message: '❌ Invalid amount. Amount must be a positive number.',
    };
  }

  try {
    // Get the split
    const split = await callViewMethod('get_split_by_repo', { repo_url: repoUrl });
    
    if (!split) {
      return {
        success: false,
        message: `❌ No split found for ${repoUrl}. Use '@bankrbot @gitsplits create ${repoUrl}' to create one.`,
      };
    }

    // Check if there are contributors
    if (!split.contributors || split.contributors.length === 0) {
      return {
        success: false,
        message: `❌ No contributors found for ${repoUrl}. The split needs to be updated with contributors first.`,
      };
    }

    // Convert amount to yoctoNEAR format
    const amountInYocto = (BigInt(amount) * BigInt(10) ** BigInt(24)).toString();

    // Distribute funds
    const distributionId = await callChangeMethod('distribute_funds', {
      split_id: split.id,
      amount: amountInYocto,
      token_id: token === 'NEAR' ? null : token,
    });

    return {
      success: true,
      message: `💸 Distribution initiated for ${repoUrl}!\n\nAmount: ${amount} ${token}\nRecipients: ${split.contributors.length} contributors\n\nContributors will be notified to claim their share.\nTrack status: https://gitsplits.example.com/distributions/${distributionId}`,
      data: { distributionId, recipientsCount: split.contributors.length },
    };
  } catch (error) {
    console.error('Error distributing funds:', error);
    return {
      success: false,
      message: `❌ Error distributing funds: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Handle the verify command
 */
async function handleVerifyCommand(
  githubUsername: string,
  sender: string,
  tweetId: string
): Promise<{
  success: boolean;
  message: string;
  data?: any;
}> {
  if (!githubUsername) {
    return {
      success: false,
      message: '❌ Missing GitHub username. Usage: @bankrbot @gitsplits verify your-github-username',
    };
  }

  try {
    // Generate a verification code
    const verificationCode = `gitsplits-verify-${Math.random().toString(36).substring(2, 10)}`;
    
    // In a real implementation, we would store this verification code and check it later
    // For now, we'll just return a success message with instructions
    
    // Generate a verification URL
    const verificationUrl = `https://gitsplits.example.com/verify?twitter=${encodeURIComponent(sender)}&github=${encodeURIComponent(githubUsername)}`;
    
    return {
      success: true,
      message: `🔍 Verification initiated for GitHub user: ${githubUsername}\n\nTo complete verification, visit:\n${verificationUrl}\n\nVerification expires in 24 hours.`,
      data: { verificationCode, verificationUrl },
    };
  } catch (error) {
    console.error('Error initiating verification:', error);
    return {
      success: false,
      message: `❌ Error initiating verification: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
