/**
 * Simple test of agent via direct import
 * Tests without needing the full web server
 */

const { processMessage } = require('./agent/dist/index');

async function test() {
  console.log('Testing GitSplits Agent\n');
  console.log('=======================\n');
  
  const tests = [
    'analyze near/near-sdk-rs',
    'create split for near/near-sdk-rs',
    'pay 100 USDC to near/near-sdk-rs',
    'verify my-github-username',
  ];
  
  for (const test of tests) {
    console.log(`User: ${test}`);
    try {
      const response = await processMessage({
        text: `@gitsplits ${test}`,
        author: 'test_user',
        type: 'web',
      });
      console.log(`Agent: ${response}\n`);
    } catch (error) {
      console.error(`Error: ${error.message}\n`);
    }
  }
  
  console.log('Done!');
}

test().catch(console.error);
