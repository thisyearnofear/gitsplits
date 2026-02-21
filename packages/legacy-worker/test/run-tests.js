// Main test script for GitSplits Worker Agent
const { spawn } = require("child_process");
const path = require("path");

/**
 * Run a test script
 * @param {string} scriptPath - Path to the test script
 * @param {string} description - Test description
 */
function runTest(scriptPath, description) {
  return new Promise((resolve) => {
    console.log(`\n========================================`);
    console.log(`Running ${description}...`);
    console.log(`========================================\n`);

    const child = spawn("node", [scriptPath], {
      stdio: "inherit",
    });

    child.on("close", (code) => {
      console.log(`\n========================================`);
      console.log(`${description} completed with code ${code}`);
      console.log(`========================================\n`);
      resolve(code);
    });
  });
}

/**
 * Run all tests
 */
async function runAllTests() {
  try {
    // Test X command parsing
    await runTest(
      path.resolve(__dirname, "./test-x-commands.js"),
      "X Command Parsing Tests"
    );

    // Test GitHub API
    await runTest(
      path.resolve(__dirname, "./github/test-github-api.js"),
      "GitHub API Tests"
    );

    // Test NEAR contract interaction
    await runTest(
      path.resolve(__dirname, "./contract/test-contract-interaction.js"),
      "NEAR Contract Tests"
    );

    // Test Twitter integration
    await runTest(
      path.resolve(__dirname, "./twitter/test-twitter-client.js"),
      "Twitter Integration Tests"
    );

    console.log("All tests completed");
  } catch (error) {
    console.error("Error running tests:", error);
  }
}

// Run all tests
runAllTests();
