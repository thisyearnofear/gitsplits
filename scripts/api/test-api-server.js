#!/usr/bin/env node
/**
 * Test script for the API server
 * 
 * This script tests the API server endpoints
 * 
 * Usage:
 * node scripts/api/test-api-server.js
 */

require('dotenv').config({ path: '.env.local' });
const axios = require('axios');

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:3001';
const RESTART_PASS = process.env.RESTART_PASS || 'RESTART_PASS';

async function testApiServer() {
  try {
    console.log('\n🚀 Testing API server...');
    
    // Test health endpoint
    console.log('\n--- Testing health endpoint ---');
    const healthResponse = await axios.get(`${API_URL}/api/health`);
    console.log('Status:', healthResponse.status);
    console.log('Response:', JSON.stringify(healthResponse.data, null, 2));
    
    // Test search endpoint
    console.log('\n--- Testing search endpoint ---');
    const searchResponse = await axios.get(`${API_URL}/api/search?pass=${RESTART_PASS}`);
    console.log('Status:', searchResponse.status);
    console.log('Response:', JSON.stringify(searchResponse.data, null, 2));
    
    console.log('\n✅ API server test completed successfully');
  } catch (error) {
    console.error(`\n❌ Error testing API server: ${error.message}`);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    
    console.log('\nTroubleshooting tips:');
    console.log('1. Make sure the API server is running');
    console.log('2. Check that the API_URL is correct');
    console.log('3. Verify that the RESTART_PASS is correct');
    
    process.exit(1);
  }
}

// Run the test
testApiServer();
