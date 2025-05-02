// Test script for Twitter integration
const TwitterCookieClient = require("../../twitterClient");
const dotenv = require("dotenv");
const path = require("path");

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, "../../.env.local") });

// Twitter configuration
const twitterConfig = {
  auth_token: process.env.TWITTER_AUTH_TOKEN,
  ct0: process.env.TWITTER_CT0,
  screenName: process.env.TWITTER_SCREEN_NAME || "gitsplits",
};

/**
 * Initialize Twitter client
 */
function initializeTwitterClient() {
  try {
    console.log("Initializing Twitter client...");
    
    if (!twitterConfig.auth_token || !twitterConfig.ct0) {
      throw new Error("Twitter Cookie Auth credentials not provided");
    }
    
    const twitterClient = new TwitterCookieClient(twitterConfig);
    console.log("Twitter client initialized successfully");
    
    return twitterClient;
  } catch (error) {
    console.error("Error initializing Twitter client:", error.message);
    return null;
  }
}

/**
 * Test getting mentions
 * @param {TwitterCookieClient} twitterClient - Twitter client
 */
async function testGetMentions(twitterClient) {
  try {
    console.log("\n--- Testing Get Mentions ---");
    
    const mentions = await twitterClient.getMentions({
      count: 5,
    });
    
    if (!mentions || mentions.length === 0) {
      console.log("No mentions found");
      return;
    }
    
    console.log(`Found ${mentions.length} mentions`);
    
    mentions.forEach((mention, index) => {
      console.log(`\nMention ${index + 1}:`);
      console.log(`- ID: ${mention.id_str}`);
      console.log(`- Text: ${mention.full_text || mention.text}`);
      console.log(`- Author: @${mention.user.screen_name}`);
      console.log(`- Created at: ${mention.created_at}`);
    });
  } catch (error) {
    console.error("Error testing get mentions:", error.message);
  }
}

/**
 * Test parsing X message
 * @param {string} text - Message text
 */
function testParseXMessage(text) {
  try {
    console.log(`\n--- Testing Parse X Message: "${text}" ---`);
    
    // Check if the message is a GitSplits command
    if (!text.includes("@bankrbot") || !text.includes("@gitsplits")) {
      console.log("Not a GitSplits command");
      return null;
    }
    
    // Extract the command
    const commandRegex = /@bankrbot\s+@gitsplits\s+(\w+)(?:\s+(.+))?/i;
    const match = text.match(commandRegex);
    
    if (!match) {
      console.log("Invalid command format");
      return null;
    }
    
    const command = match[1].toLowerCase();
    const args = match[2] ? match[2].trim() : "";
    
    console.log(`Command: ${command}`);
    console.log(`Arguments: ${args}`);
    
    // Parse specific commands
    switch (command) {
      case "create":
        return {
          command: "create",
          repo: args,
          sender: "test-user",
        };
        
      case "distribute":
        const distributeRegex = /(\d+(?:\.\d+)?)\s+(\w+)\s+to\s+(.+)/i;
        const distributeMatch = args.match(distributeRegex);
        
        if (!distributeMatch) {
          console.log("Invalid distribute command format");
          return null;
        }
        
        return {
          command: "distribute",
          amount: distributeMatch[1],
          token: distributeMatch[2],
          repo: distributeMatch[3],
          sender: "test-user",
        };
        
      case "verify":
        return {
          command: "verify",
          github_username: args,
          sender: "test-user",
        };
        
      case "info":
        return {
          command: "info",
          repo: args,
          sender: "test-user",
        };
        
      case "help":
        return {
          command: "help",
          sender: "test-user",
        };
        
      default:
        console.log(`Unknown command: ${command}`);
        return null;
    }
  } catch (error) {
    console.error("Error parsing X message:", error.message);
    return null;
  }
}

/**
 * Run tests
 */
async function runTests() {
  // Initialize Twitter client
  const twitterClient = initializeTwitterClient();
  
  if (twitterClient) {
    // Test getting mentions
    await testGetMentions(twitterClient);
  }
  
  // Test parsing X messages
  testParseXMessage("@bankrbot @gitsplits create near/near-sdk-rs");
  testParseXMessage("@bankrbot @gitsplits distribute 5 SOL to near/near-sdk-rs");
  testParseXMessage("@bankrbot @gitsplits verify papajams");
  testParseXMessage("@bankrbot @gitsplits info near/near-sdk-rs");
  testParseXMessage("@bankrbot @gitsplits help");
  testParseXMessage("This is not a command");
  testParseXMessage("@bankrbot @gitsplits unknown command");
}

// Run the tests
runTests();
