import type { NextApiRequest, NextApiResponse } from 'next';
import { KeyPair, keyStores, connect } from 'near-api-js';
import axios from 'axios';
import { VerificationLevel, SplitContributor } from '@/types';

type ResponseData = {
  success: boolean;
  message?: string;
  command_id?: string;
  status?: string;
  result?: any;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { command, repo_url, sender, tweet_id } = req.body;

    if (!command) {
      return res.status(400).json({ success: false, message: 'Command is required' });
    }

    // Generate a unique command ID
    const commandId = `cmd-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Process the command based on its type
    let result;
    switch (command.toLowerCase()) {
      case 'create':
        result = await handleCreateCommand(repo_url, sender);
        break;
      case 'info':
        result = await handleInfoCommand(repo_url);
        break;
      case 'distribute':
        const { amount, token } = req.body;
        result = await handleDistributeCommand(repo_url, amount, token || 'NEAR', sender);
        break;
      case 'verify':
        const { github_username } = req.body;
        result = await handleVerifyCommand(github_username, sender);
        break;
      case 'help':
        result = {
          success: true,
          message: getHelpMessage(),
        };
        break;
      case 'version':
        result = {
          success: true,
          message: getVersionMessage(),
        };
        break;
      default:
        return res.status(400).json({
          success: false,
          message: `Unknown command: ${command}`
        });
    }

    // If tweet_id is provided, send a reply on X
    if (tweet_id && result.success) {
      await sendXReply(tweet_id, result.message);
    }

    // Return the result
    return res.status(200).json({
      success: true,
      command_id: commandId,
      status: 'completed',
      result,
    });
  } catch (error) {
    console.error('Error processing command:', error);
    return res.status(500).json({
      success: false,
      message: `Error processing command: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

// Handler functions for different commands

async function handleCreateCommand(repoUrl: string, sender: string) {
  if (!repoUrl) {
    return { success: false, message: 'Repository URL is required' };
  }

  try {
    // Verify repository ownership
    const ownershipResponse = await axios.post('/api/github/verify-ownership', {
      repoUrl,
      twitterUsername: sender,
    });

    if (!ownershipResponse.data.success) {
      return {
        success: false,
        message: `❌ Repository ownership verification failed: ${ownershipResponse.data.message || 'You need to verify your GitHub identity and have admin permissions on the repository.'}`,
      };
    }

    // Analyze contributions with anti-gaming measures
    const analysisResponse = await axios.post('/api/github/analyze-contributions', {
      repoUrl,
    });

    if (!analysisResponse.data.success) {
      return {
        success: false,
        message: `❌ Contribution analysis failed: ${analysisResponse.data.message || 'Failed to analyze repository contributions.'}`,
      };
    }

    // Connect to NEAR contract
    const { account, contractId } = await connectToNear();

    // Call the create_split method on the contract
    const result = await account.functionCall({
      contractId,
      methodName: 'create_split',
      args: {
        repo_url: repoUrl,
        owner: sender,
      },
      gas: '300000000000000', // 300 TGas
      attachedDeposit: '0',
    });

    // Parse the result
    const splitId = JSON.parse(Buffer.from(result.status.SuccessValue, 'base64').toString());

    // Update the split with contributors from the analysis
    const contributors = analysisResponse.data.contributors.map((contributor: SplitContributor) => ({
      github_username: contributor.githubUsername,
      account_id: null, // Will be linked when users verify their GitHub identities
      percentage: (contributor.percentage * 1e22).toString(), // Convert percentage to NEAR's U128 format
    }));

    // Update the split with contributors
    await account.functionCall({
      contractId,
      methodName: 'update_split',
      args: {
        split_id: splitId,
        contributors,
      },
      gas: '300000000000000', // 300 TGas
      attachedDeposit: '0',
    });

    // Format top contributors for the message
    const topContributors = analysisResponse.data.contributors
      .slice(0, 3)
      .map((c: SplitContributor) => `${c.githubUsername}: ${c.percentage}%`);

    return {
      success: true,
      message: `✅ Split created for ${repoUrl}!\n\nTop contributors:\n- ${topContributors.join('\n- ')}\n\nTotal contributors: ${contributors.length}\nView details: https://gitsplits.example.com/splits/${splitId}`,
      splitId,
      contributorsCount: contributors.length,
    };
  } catch (error) {
    console.error('Error creating split:', error);
    return {
      success: false,
      message: `❌ Error creating split: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

async function handleInfoCommand(repoUrl: string) {
  if (!repoUrl) {
    return { success: false, message: 'Repository URL is required' };
  }

  try {
    // Connect to NEAR contract
    const { account, contractId } = await connectToNear();

    // Call the get_split_by_repo method on the contract
    const result = await account.viewFunction({
      contractId,
      methodName: 'get_split_by_repo',
      args: {
        repo_url: repoUrl,
      },
    });

    if (!result) {
      return {
        success: false,
        message: `No split found for ${repoUrl}`,
      };
    }

    // Get distribution history
    const distributionIds = await account.viewFunction({
      contractId,
      methodName: 'get_distribution_history',
      args: {
        split_id: result.id,
      },
    });

    // Format the top contributors
    const topContributors = result.contributors
      .sort((a: any, b: any) => Number(b.percentage) - Number(a.percentage))
      .slice(0, 3)
      .map((c: any) => `${c.github_username}: ${(Number(c.percentage) / 1e24 * 100).toFixed(1)}%`);

    return {
      success: true,
      message: `📊 Split info for ${repoUrl}:\n\nTop contributors:\n- ${topContributors.join('\n- ')}\n\nTotal contributors: ${result.contributors.length}\nTotal distributions: ${distributionIds.length}\nView details: https://gitsplits.example.com/splits/${result.id}`,
      split: result,
      distributionCount: distributionIds.length,
    };
  } catch (error) {
    console.error('Error getting split info:', error);
    return {
      success: false,
      message: `❌ Error getting split info: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

async function handleDistributeCommand(repoUrl: string, amount: string, token: string, sender: string) {
  if (!repoUrl) {
    return { success: false, message: 'Repository URL is required' };
  }

  if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
    return { success: false, message: 'Valid amount is required' };
  }

  try {
    // Check user verification level
    const verificationLevel = await getUserVerificationLevel(sender);

    // For larger amounts, require higher verification
    const amountNum = Number(amount);
    if (amountNum > 100 && verificationLevel < VerificationLevel.GitHub) {
      return {
        success: false,
        message: `❌ GitHub verification required for distributions over 100 ${token}. Please verify your GitHub identity with '@bankrbot @gitsplits verify your-github-username'`,
      };
    }

    if (amountNum > 1000 && verificationLevel < VerificationLevel.Repository) {
      return {
        success: false,
        message: `❌ Repository verification required for distributions over 1000 ${token}. Please verify repository ownership.`,
      };
    }

    // Connect to NEAR contract
    const { account, contractId } = await connectToNear();

    // Get the split ID for the repository
    const split = await account.viewFunction({
      contractId,
      methodName: 'get_split_by_repo',
      args: {
        repo_url: repoUrl,
      },
    });

    if (!split) {
      return {
        success: false,
        message: `❌ No split found for ${repoUrl}`,
      };
    }

    // Call the distribute_funds method on the contract
    const result = await account.functionCall({
      contractId,
      methodName: 'distribute_funds',
      args: {
        split_id: split.id,
        amount: amount + '000000000000000000000000', // Convert to yoctoNEAR
        token_id: token === 'NEAR' ? null : token,
      },
      gas: '300000000000000', // 300 TGas
      attachedDeposit: '0',
    });

    // Parse the result
    const distributionId = JSON.parse(Buffer.from(result.status.SuccessValue, 'base64').toString());

    return {
      success: true,
      message: `💸 Distribution initiated for ${repoUrl}!\n\nAmount: ${amount} ${token}\nRecipients: ${split.contributors.length} contributors\n\nContributors will be notified to claim their share.\nTrack status: https://gitsplits.example.com/distributions/${distributionId}`,
      distributionId,
      recipientsCount: split.contributors.length,
    };
  } catch (error) {
    console.error('Error distributing funds:', error);
    return {
      success: false,
      message: `❌ Error distributing funds: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

async function handleVerifyCommand(githubUsername: string, twitterUsername: string) {
  if (!githubUsername) {
    return { success: false, message: 'GitHub username is required' };
  }

  try {
    // Initiate GitHub verification
    const response = await axios.post('/api/github/verify', {
      twitterUsername,
      githubUsername,
    });

    if (response.data.success) {
      const verificationId = response.data.verificationId;
      const verificationCode = response.data.verificationCode;

      return {
        success: true,
        message: `🔍 Verification initiated for GitHub user: ${githubUsername}\n\nTo complete verification, add this code to your GitHub profile or create a repository with this name:\n\n${verificationCode}\n\nVerification expires in 24 hours.\nCheck status: https://gitsplits.example.com/verify/${verificationId}`,
        verificationId,
        verificationCode,
      };
    } else {
      return {
        success: false,
        message: `❌ Failed to initiate verification: ${response.data.error || 'Unknown error'}`,
      };
    }
  } catch (error) {
    console.error('Error verifying GitHub identity:', error);
    return {
      success: false,
      message: `❌ Error initiating verification: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// Helper functions

/**
 * Get the verification level of a user
 */
async function getUserVerificationLevel(twitterUsername: string): Promise<VerificationLevel> {
  try {
    // In a real implementation, this would check the user's verification level in the database
    // For now, we'll assume all users have Basic verification
    return VerificationLevel.Basic;
  } catch (error) {
    console.error('Error getting user verification level:', error);
    return VerificationLevel.None;
  }
}

async function connectToNear() {
  // Get contract ID from environment variables
  const contractId = process.env.NEXT_PUBLIC_contractId;
  if (!contractId) {
    throw new Error('Contract ID is not defined in environment variables');
  }

  // In a real implementation, this would use the ephemeral key generated within the TEE
  // For demonstration purposes, we'll use a placeholder key
  const keyPair = KeyPair.fromString(process.env.NEXT_PUBLIC_secretKey || '');

  // Connect to NEAR
  const keyStore = new keyStores.InMemoryKeyStore();
  await keyStore.setKey('testnet', process.env.NEXT_PUBLIC_accountId || '', keyPair);

  const config = {
    networkId: 'testnet',
    keyStore,
    nodeUrl: 'https://rpc.testnet.near.org',
    walletUrl: 'https://wallet.testnet.near.org',
    helperUrl: 'https://helper.testnet.near.org',
    explorerUrl: 'https://explorer.testnet.near.org',
  };

  const near = await connect(config);
  const account = await near.account(process.env.NEXT_PUBLIC_accountId || '');

  return { account, contractId };
}

async function sendXReply(tweetId: string, message: string) {
  // In a real implementation, this would use the X API to send a reply
  // For demonstration purposes, we'll just log the message
  console.log(`Sending X reply to tweet ${tweetId}: ${message}`);

  // Mock implementation - in a real app, you would use the X API
  try {
    // This is a placeholder for the actual X API call
    console.log('X API call would happen here');
    return true;
  } catch (error) {
    console.error('Error sending X reply:', error);
    return false;
  }
}

/**
 * Get the help message
 */
function getHelpMessage(): string {
  return `📚 GitSplits X Agent Commands:

1️⃣ Create a split:
   @bankrbot @gitsplits create github.com/user/repo

2️⃣ Get split info:
   @bankrbot @gitsplits info github.com/user/repo

3️⃣ Distribute funds:
   @bankrbot @gitsplits distribute 100 NEAR to github.com/user/repo

4️⃣ Verify GitHub identity:
   @bankrbot @gitsplits verify your-github-username

5️⃣ Get version info:
   @bankrbot @gitsplits version

Learn more at https://gitsplits.example.com`;
}

/**
 * Get the version message
 */
function getVersionMessage(): string {
  return `GitSplits X Agent v0.1.0
Built with NEAR Shade Agents
Worker: TEE-secured (Phala Cloud)
Contract: ${process.env.NEXT_PUBLIC_contractId || "gitsplits.near"}`;
}
