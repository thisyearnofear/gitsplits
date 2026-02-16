#!/usr/bin/env ts-node

/**
 * Farcaster Setup Script
 * 
 * Generates wallet and guides through FID registration
 */

import { Wallet } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';

console.log('╔════════════════════════════════════════╗');
console.log('║      Farcaster Setup for @gitsplits    ║');
console.log('╚════════════════════════════════════════╝');
console.log('');

// Generate wallet
const wallet = Wallet.createRandom();

console.log('Generated Ethereum Wallet:');
console.log('==========================');
console.log(`Address: ${wallet.address}`);
console.log(`Private Key: ${wallet.privateKey}`);
console.log('');

console.log('Next Steps:');
console.log('===========');
console.log('1. Fund this address with ~$1 ETH on Optimism');
console.log('   - Use any exchange or bridge');
console.log('   - Address:', wallet.address);
console.log('');
console.log('2. Register FID at https://farcaster.xyz');
console.log('   - Connect wallet');
console.log('   - Claim your FID (costs ~$5 in ETH)');
console.log('   - Choose username: @gitsplits (if available)');
console.log('');
console.log('3. Get your FID number from the Farcaster app');
console.log('   - Check your profile, it shows FID: XXXXX');
console.log('');

// Save to file
const outputPath = path.join(__dirname, '..', 'agent', '.env.farcaster');
const envContent = `# Farcaster Configuration
# Generated: ${new Date().toISOString()}
# Wallet Address: ${wallet.address}
FARCASTER_PRIVATE_KEY=${wallet.privateKey}
FARCASTER_FID=YOUR_FID_HERE
`;

fs.writeFileSync(outputPath, envContent);

console.log(`Wallet saved to: ${outputPath}`);
console.log('');
console.log('After getting your FID, update .env.farcaster with:');
console.log('FARCASTER_FID=12345  (your actual FID)');
console.log('');
console.log('Then merge into agent/.env:');
console.log('cat agent/.env.farcaster >> agent/.env');
