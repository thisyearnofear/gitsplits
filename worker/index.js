// GitSplits Worker Agent
// This agent runs in a TEE (Trusted Execution Environment) and handles
// communication between X (Twitter), GitHub, and the NEAR contract.

const { connect, keyStores, KeyPair, Contract } = require('near-api-js');
const { Octokit } = require('@octokit/rest');
const { TwitterApi } = require('twitter-api-v2');
const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
app.use(bodyParser.json());

// NEAR configuration
const nearConfig = {
  networkId: process.env.NEAR_NETWORK_ID || 'testnet',
  nodeUrl: process.env.NEAR_NODE_URL || 'https://rpc.testnet.near.org',
  contractName: process.env.NEAR_CONTRACT_ID || 'gitsplits-test.testnet',
  walletUrl: process.env.NEAR_WALLET_URL || 'https://wallet.testnet.near.org',
  helperUrl: process.env.NEAR_HELPER_URL || 'https://helper.testnet.near.org',
};

// GitHub configuration
const githubConfig = {
  auth: process.env.GITHUB_TOKEN,
};

// Twitter configuration
const twitterConfig = {
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_SECRET,
};

// Worker agent state
let nearConnection = null;
let nearContract = null;
let githubClient = null;
let twitterClient = null;

/**
 * Initialize all external connections
 */
async function initializeConnections() {
  try {
    // Initialize NEAR connection
    const keyStore = new keyStores.InMemoryKeyStore();
    
    // Load private key from environment variable
    if (process.env.NEAR_PRIVATE_KEY) {
      const keyPair = KeyPair.fromString(process.env.NEAR_PRIVATE_KEY);
      await keyStore.setKey(nearConfig.networkId, nearConfig.contractName, keyPair);
    }
    
    nearConnection = await connect({
      deps: { keyStore },
      ...nearConfig,
    });
    
    // Get account object
    const account = await nearConnection.account(process.env.NEAR_ACCOUNT_ID);
    
    // Initialize contract
    nearContract = new Contract(account, nearConfig.contractName, {
      viewMethods: [
        'is_worker_registered',
        'get_split',
        'get_split_by_repo',
      ],
      changeMethods: [
        'register_worker',
        'create_split',
        'update_split',
        'generate_chain_signature',
      ],
    });
    
    // Initialize GitHub client
    githubClient = new Octokit(githubConfig);
    
    // Initialize Twitter client
    twitterClient = new TwitterApi(twitterConfig);
    
    console.log('All connections initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing connections:', error);
    return false;
  }
}

/**
 * Parse GitHub repository URL to extract owner and repo name
 * @param {string} repoUrl - GitHub repository URL
 * @returns {Object} - { owner, repo }
 */
function parseGitHubUrl(repoUrl) {
  try {
    // Handle different URL formats
    let cleanUrl = repoUrl;
    
    // Remove protocol and www if present
    cleanUrl = cleanUrl.replace(/^(https?:\/\/)?(www\.)?/, '');
    
    // Handle github.com URLs
    if (cleanUrl.startsWith('github.com/')) {
      cleanUrl = cleanUrl.substring('github.com/'.length);
    }
    
    // Split by slash to get owner and repo
    const parts = cleanUrl.split('/');
    if (parts.length < 2) {
      throw new Error('Invalid GitHub URL format');
    }
    
    return {
      owner: parts[0],
      repo: parts[1].replace('.git', ''), // Remove .git if present
    };
  } catch (error) {
    console.error('Error parsing GitHub URL:', error);
    throw new Error('Invalid GitHub repository URL');
  }
}

/**
 * Analyze GitHub repository contributions
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<Array>} - Contributors with percentages
 */
async function analyzeContributions(owner, repo) {
  try {
    // Get repository contributors from GitHub API
    const { data: contributors } = await githubClient.repos.listContributors({
      owner,
      repo,
      per_page: 100,
    });
    
    // Calculate total contributions
    const totalContributions = contributors.reduce(
      (sum, contributor) => sum + contributor.contributions,
      0
    );
    
    // Calculate percentage for each contributor
    const contributorsWithPercentage = await Promise.all(
      contributors.map(async (contributor) => {
        // Get contributor details
        const { data: user } = await githubClient.users.getByUsername({
          username: contributor.login,
        });
        
        // Calculate percentage (using NEAR's yoctoNEAR precision)
        const percentage = Math.floor(
          (contributor.contributions / totalContributions) * 100_000_000_000_000_000_000_000
        );
        
        return {
          github_username: contributor.login,
          account_id: null, // Will be filled when user links their NEAR account
          percentage: percentage.toString(),
        };
      })
    );
    
    return contributorsWithPercentage;
  } catch (error) {
    console.error('Error analyzing contributions:', error);
    throw new Error('Failed to analyze repository contributions');
  }
}

/**
 * Process X (Twitter) command
 * @param {Object} command - Parsed command from X
 * @returns {Promise<Object>} - Response to send back to X
 */
async function processXCommand(command) {
  try {
    switch (command.action) {
      case 'create':
        return await handleCreateCommand(command);
      
      case 'distribute':
        return await handleDistributeCommand(command);
      
      case 'verify':
        return await handleVerifyCommand(command);
      
      case 'info':
        return await handleInfoCommand(command);
      
      case 'help':
        return {
          success: true,
          message: 'Available commands:\n' +
            '- create <repo>: Create a new split for a repository\n' +
            '- distribute <amount> <token> to <repo>: Distribute funds to contributors\n' +
            '- verify <github_username>: Link your GitHub identity\n' +
            '- info <repo>: Get information about a repository split\n' +
            '- help: Show this help message',
        };
      
      default:
        return {
          success: false,
          message: 'Unknown command. Try @bankrbot @gitsplits help for available commands.',
        };
    }
  } catch (error) {
    console.error('Error processing X command:', error);
    return {
      success: false,
      message: `Error: ${error.message}`,
    };
  }
}

/**
 * Handle create command
 * @param {Object} command - Parsed command
 * @returns {Promise<Object>} - Response
 */
async function handleCreateCommand(command) {
  try {
    const repoUrl = command.repo;
    if (!repoUrl) {
      return {
        success: false,
        message: 'Please specify a repository name or URL.',
      };
    }
    
    // Check if split already exists
    const existingSplit = await nearContract.get_split_by_repo({ repo_url: repoUrl });
    if (existingSplit) {
      return {
        success: false,
        message: `A split already exists for ${repoUrl}. Use 'info ${repoUrl}' to see details.`,
      };
    }
    
    // Parse GitHub URL
    const { owner, repo } = parseGitHubUrl(repoUrl);
    
    // Analyze contributions
    const contributors = await analyzeContributions(owner, repo);
    
    // Create split on NEAR contract
    const splitId = await nearContract.create_split({
      repo_url: repoUrl,
      owner: command.sender, // X user who sent the command
    });
    
    // Update split with contributors
    await nearContract.update_split({
      split_id: splitId,
      contributors,
    });
    
    return {
      success: true,
      message: `✅ Split created for ${repoUrl}!\n` +
        `ID: ${splitId}\n` +
        `Contributors: ${contributors.length}\n` +
        `Use 'info ${repoUrl}' to see details.`,
    };
  } catch (error) {
    console.error('Error handling create command:', error);
    return {
      success: false,
      message: `Failed to create split: ${error.message}`,
    };
  }
}

/**
 * Handle distribute command
 * @param {Object} command - Parsed command
 * @returns {Promise<Object>} - Response
 */
async function handleDistributeCommand(command) {
  // This is a placeholder for the distribute command implementation
  // In a real implementation, this would handle the distribution of funds
  return {
    success: true,
    message: `Distribution of ${command.amount} ${command.token} to ${command.repo} is not yet implemented.`,
  };
}

/**
 * Handle verify command
 * @param {Object} command - Parsed command
 * @returns {Promise<Object>} - Response
 */
async function handleVerifyCommand(command) {
  // This is a placeholder for the verify command implementation
  // In a real implementation, this would verify the GitHub identity
  return {
    success: true,
    message: `Verification of GitHub username ${command.github_username} is not yet implemented.`,
  };
}

/**
 * Handle info command
 * @param {Object} command - Parsed command
 * @returns {Promise<Object>} - Response
 */
async function handleInfoCommand(command) {
  try {
    const repoUrl = command.repo;
    if (!repoUrl) {
      return {
        success: false,
        message: 'Please specify a repository name or URL.',
      };
    }
    
    // Get split information
    const split = await nearContract.get_split_by_repo({ repo_url: repoUrl });
    if (!split) {
      return {
        success: false,
        message: `No split found for ${repoUrl}. Create one with 'create ${repoUrl}'.`,
      };
    }
    
    // Format contributors
    const contributorsInfo = split.contributors.map((contributor) => {
      const percentage = (contributor.percentage / 1e24).toFixed(2);
      return `${contributor.github_username}: ${percentage}%`;
    }).join('\n');
    
    return {
      success: true,
      message: `📊 Split for ${split.repo_url}:\n` +
        `ID: ${split.id}\n` +
        `Owner: ${split.owner}\n` +
        `Created: ${new Date(split.created_at / 1000000).toLocaleString()}\n` +
        `Contributors:\n${contributorsInfo}`,
    };
  } catch (error) {
    console.error('Error handling info command:', error);
    return {
      success: false,
      message: `Failed to get split info: ${error.message}`,
    };
  }
}

/**
 * Parse X (Twitter) message to extract command
 * @param {Object} message - X message object
 * @returns {Object} - Parsed command
 */
function parseXMessage(message) {
  try {
    // Extract text from message
    const text = message.text.toLowerCase();
    
    // Check if message is directed to GitSplits
    if (!text.includes('@bankrbot') || !text.includes('@gitsplits')) {
      return null;
    }
    
    // Remove mentions
    const cleanText = text
      .replace(/@bankrbot/g, '')
      .replace(/@gitsplits/g, '')
      .trim();
    
    // Parse command
    if (cleanText.startsWith('create')) {
      const repo = cleanText.substring('create'.length).trim();
      return { action: 'create', repo, sender: message.author_id };
    }
    
    if (cleanText.startsWith('distribute')) {
      const parts = cleanText.match(/distribute\s+(\d+)\s+(\w+)\s+to\s+(.+)/i);
      if (parts) {
        return {
          action: 'distribute',
          amount: parts[1],
          token: parts[2],
          repo: parts[3],
          sender: message.author_id,
        };
      }
    }
    
    if (cleanText.startsWith('verify')) {
      const github_username = cleanText.substring('verify'.length).trim();
      return { action: 'verify', github_username, sender: message.author_id };
    }
    
    if (cleanText.startsWith('info')) {
      const repo = cleanText.substring('info'.length).trim();
      return { action: 'info', repo, sender: message.author_id };
    }
    
    if (cleanText.startsWith('help')) {
      return { action: 'help', sender: message.author_id };
    }
    
    // Handle natural language commands
    if (cleanText.includes('make a split') || cleanText.includes('create a split')) {
      const repoMatch = cleanText.match(/for\s+(.+)/i);
      if (repoMatch) {
        return { action: 'create', repo: repoMatch[1], sender: message.author_id };
      }
    }
    
    if (cleanText.includes('send') || cleanText.includes('distribute')) {
      const parts = cleanText.match(/(send|distribute)\s+(\d+)\s+(\w+)\s+to\s+(.+)/i);
      if (parts) {
        return {
          action: 'distribute',
          amount: parts[2],
          token: parts[3],
          repo: parts[4],
          sender: message.author_id,
        };
      }
    }
    
    if (cleanText.includes('show') && cleanText.includes('info')) {
      const repoMatch = cleanText.match(/(about|for)\s+(.+)/i);
      if (repoMatch) {
        return { action: 'info', repo: repoMatch[2], sender: message.author_id };
      }
    }
    
    // Default to help if command is not recognized
    return { action: 'help', sender: message.author_id };
  } catch (error) {
    console.error('Error parsing X message:', error);
    return { action: 'help', sender: message.author_id };
  }
}

// API endpoints
app.post('/api/webhook/twitter', async (req, res) => {
  try {
    const message = req.body;
    
    // Parse X message
    const command = parseXMessage(message);
    if (!command) {
      return res.status(200).json({ message: 'Not a GitSplits command' });
    }
    
    // Process command
    const response = await processXCommand(command);
    
    // Send response back to X
    // In a real implementation, this would use the Twitter API to reply
    console.log('Response to X:', response);
    
    return res.status(200).json(response);
  } catch (error) {
    console.error('Error processing webhook:', error);
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Initialize connections and start server
const PORT = process.env.PORT || 3001;

async function startServer() {
  const initialized = await initializeConnections();
  if (!initialized) {
    console.error('Failed to initialize connections. Exiting...');
    process.exit(1);
  }
  
  app.listen(PORT, () => {
    console.log(`GitSplits Worker Agent running on port ${PORT}`);
  });
}

startServer();
