// Test X Commands
// This file tests the parsing of X commands

const assert = require("assert");

// Mock the parseXMessage function from index.js
function parseXMessage(message) {
  try {
    // Extract text from message
    const text = message.text.toLowerCase();

    // Check if message is directed to GitSplits
    if (!text.includes("@gitsplits")) {
      return null;
    }

    // Remove mentions
    const cleanText = text
      .replace(/@gitsplits/g, "")
      .trim();

    // Parse repository analysis command (just the repo URL)
    // This is the simplest form: @gitsplits github.com/user/repo
    if (
      !cleanText.startsWith("create") &&
      !cleanText.startsWith("splits") &&
      !cleanText.startsWith("split") &&
      !cleanText.startsWith("help") &&
      !cleanText.startsWith("verify") &&
      !cleanText.startsWith("distribute")
    ) {
      // If it's just a repo URL or name, treat it as an analysis request
      return {
        action: "analyze",
        repo: cleanText.trim(),
        sender: message.author_id,
      };
    }

    // Parse create split command
    // Format: create split <repo> [allocation]
    if (cleanText.startsWith("create split")) {
      const createSplitText = cleanText.substring("create split".length).trim();

      // Check if there's a custom allocation
      const parts = createSplitText.split(/\s+(?=\d+\/|default$)/);

      if (parts.length >= 1) {
        const repo = parts[0].trim();
        const allocation = parts.length > 1 ? parts[1].trim() : "default";

        return {
          action: "create",
          repo,
          allocation,
          sender: message.author_id,
        };
      }
    }

    // Legacy create command for backward compatibility
    if (
      cleanText.startsWith("create") &&
      !cleanText.startsWith("create split")
    ) {
      const repo = cleanText.substring("create".length).trim();
      return {
        action: "create",
        repo,
        allocation: "default",
        sender: message.author_id,
      };
    }

    // Parse splits command (view active splits for a repo)
    if (cleanText.startsWith("splits")) {
      const repo = cleanText.substring("splits".length).trim();
      return {
        action: "splits",
        repo,
        sender: message.author_id,
      };
    }

    // Parse split command (view a specific split)
    if (cleanText.startsWith("split") && !cleanText.startsWith("splits")) {
      const splitId = cleanText.substring("split".length).trim();
      return {
        action: "split",
        splitId,
        sender: message.author_id,
      };
    }

    // Parse distribute command
    if (cleanText.startsWith("distribute")) {
      const parts = cleanText.match(/distribute\s+(\d+)\s+(\w+)\s+to\s+(.+)/i);
      if (parts) {
        return {
          action: "distribute",
          amount: parts[1],
          token: parts[2],
          repo: parts[3],
          sender: message.author_id,
        };
      }
    }

    // Parse verify command
    if (cleanText.startsWith("verify")) {
      const github_username = cleanText.substring("verify".length).trim();
      return {
        action: "verify",
        github_username,
        sender: message.author_id,
      };
    }

    // Legacy info command parsing removed

    // Parse help command
    if (cleanText.startsWith("help")) {
      return {
        action: "help",
        sender: message.author_id,
      };
    }

    // Default to help if command is not recognized
    return { action: "help", sender: message.author_id };
  } catch (error) {
    console.error("Error parsing X message:", error);
    return { action: "help", sender: message.author_id };
  }
}

// Test cases
const testCases = [
  {
    name: "Repository analysis",
    input: {
      text: "@gitsplits github.com/near/near-sdk-rs",
      author_id: "test_user",
    },
    expected: {
      action: "analyze",
      repo: "github.com/near/near-sdk-rs",
      sender: "test_user",
    },
  },
  {
    name: "Create split with default allocation",
    input: {
      text: "@gitsplits create split github.com/near/near-sdk-rs default",
      author_id: "test_user",
    },
    expected: {
      action: "create",
      repo: "github.com/near/near-sdk-rs",
      allocation: "default",
      sender: "test_user",
    },
  },
  {
    name: "Create split with custom allocation",
    input: {
      text: "@gitsplits create split github.com/near/near-sdk-rs 50/30/20",
      author_id: "test_user",
    },
    expected: {
      action: "create",
      repo: "github.com/near/near-sdk-rs",
      allocation: "50/30/20",
      sender: "test_user",
    },
  },
  // Legacy create command test removed
  {
    name: "View splits for a repository",
    input: {
      text: "@gitsplits splits github.com/near/near-sdk-rs",
      author_id: "test_user",
    },
    expected: {
      action: "splits",
      repo: "github.com/near/near-sdk-rs",
      sender: "test_user",
    },
  },
  {
    name: "View split details",
    input: {
      text: "@gitsplits split split-12345",
      author_id: "test_user",
    },
    expected: {
      action: "split",
      splitId: "split-12345",
      sender: "test_user",
    },
  },
  // Legacy info command test removed
  {
    name: "Verify command",
    input: {
      text: "@gitsplits verify papajams",
      author_id: "test_user",
    },
    expected: {
      action: "verify",
      github_username: "papajams",
      sender: "test_user",
    },
  },
  {
    name: "Distribute command",
    input: {
      text: "@gitsplits distribute 5 NEAR to github.com/near/near-sdk-rs",
      author_id: "test_user",
    },
    expected: {
      action: "distribute",
      amount: "5",
      token: "NEAR",
      repo: "github.com/near/near-sdk-rs",
      sender: "test_user",
    },
  },
  {
    name: "Help command",
    input: {
      text: "@gitsplits help",
      author_id: "test_user",
    },
    expected: {
      action: "help",
      sender: "test_user",
    },
  },
  {
    name: "Unknown command",
    input: {
      text: "@gitsplits unknown command",
      author_id: "test_user",
    },
    expected: {
      action: "help",
      sender: "test_user",
    },
  },
  {
    name: "Not a GitSplits command",
    input: {
      text: "@someone else",
      author_id: "test_user",
    },
    expected: null,
  },
];

// Run tests
console.log("Running X command parsing tests...");
let passed = 0;
let failed = 0;

testCases.forEach((testCase) => {
  try {
    const result = parseXMessage(testCase.input);
    const expected = testCase.expected;

    // Compare result with expected
    if (JSON.stringify(result) === JSON.stringify(expected)) {
      console.log(`✅ Test "${testCase.name}" passed`);
      passed++;
    } else {
      console.log(`❌ Test "${testCase.name}" failed`);
      console.log("  Expected:", expected);
      console.log("  Got:", result);
      failed++;
    }
  } catch (error) {
    console.log(`❌ Test "${testCase.name}" failed with error:`, error);
    failed++;
  }
});

console.log(`\nTest results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}
