#!/usr/bin/env node

const { execSync } = require('child_process');

// Regex patterns for secrets
const patterns = [
  /AKIA[0-9A-Z]{16}/, // AWS Access Key
  /SG\.[0-9a-zA-Z._-]{22}\.[0-9a-zA-Z._-]{43}/, // SendGrid API Key
  /AIza[0-9A-Za-z\\-_]{35}/, // Google API Key
  /xox[pb]-[0-9]{12}-[0-9]{12}-[0-9]{12}-[a-z0-9]{32}/, // Slack Token
  /sk-[a-zA-Z0-9]{48}/, // OpenAI API Key
  /0x[a-fA-F0-9]{64}/, // Ethereum Private Key (64 hex chars)
];

const files = process.argv.slice(2);
let foundSecret = false;

files.forEach(file => {
  try {
    const content = execSync(`cat "${file}"`).toString();
    patterns.forEach(pattern => {
      if (pattern.test(content)) {
        console.error(`❌ Possible secret found in ${file} matching pattern ${pattern}`);
        foundSecret = true;
      }
    });
  } catch (e) {
    // Skip binary files or files that can't be read
  }
});

if (foundSecret) {
  console.error("🛑 Commit blocked. Please remove secrets before committing.");
  process.exit(1);
}
