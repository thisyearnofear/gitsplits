/**
 * GitSplits Agent Server
 * 
 * HTTP server for the agent with health checks, metrics,
 * and Farcaster integration for autonomous operation.
 */

import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import { processMessage } from './index';
import { createFarcasterClient, FarcasterClient } from './services/farcaster';
import { eigenaiTool } from './tools/eigenai';
import { teeWalletTool } from './tools/tee-wallet';
import {
  getGitHubAuthMode,
  isProductionMode,
  validateProductionReadiness,
  validateRuntimeConfig,
} from './config';

const PORT = process.env.PORT || 3000;

// Track server state
let farcasterClient: FarcasterClient | null = null;
let startTime = Date.now();
let requestCount = 0;
let errorCount = 0;

/**
 * Health check response
 */
interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  services: {
    farcaster: 'connected' | 'disconnected' | 'disabled';
    github: 'available' | 'unavailable';
    near: 'available' | 'unavailable';
    pingpay: 'available' | 'unavailable';
    eigenai: 'available' | 'unavailable';
    teeWallet: 'tee' | 'mock';
  };
  readiness: {
    ready: boolean;
    reasons: string[];
  };
  metrics: {
    requests: number;
    errors: number;
  };
}

/**
 * Get current health status
 */
async function getHealthStatus(): Promise<HealthStatus> {
  const runtime = validateRuntimeConfig();
  const productionReadiness = validateProductionReadiness();
  const isProduction = isProductionMode();
  const githubAvailable = isProduction
    ? productionReadiness.checks.githubApp
    : getGitHubAuthMode() !== 'none';
  const nearAvailable = isProduction
    ? productionReadiness.checks.near
    : !!process.env.NEAR_PRIVATE_KEY;
  const pingpayAvailable = isProduction
    ? productionReadiness.checks.pingpay
    : !!process.env.PING_PAY_API_KEY;
  const eigenaiAvailable = isProduction
    ? productionReadiness.checks.eigenai
    : !!process.env.EIGENAI_WALLET_PRIVATE_KEY;
  
  return {
    status:
      runtime.errors.length === 0 &&
      (!isProduction || productionReadiness.ready)
        ? 'healthy'
        : 'unhealthy',
    timestamp: new Date().toISOString(),
    uptime: Date.now() - startTime,
    version: process.env.npm_package_version || '1.0.0',
    services: {
      farcaster: farcasterClient ? 'connected' : process.env.NEYNAR_API_KEY ? 'disconnected' : 'disabled',
      github: githubAvailable ? 'available' : 'unavailable',
      near: nearAvailable ? 'available' : 'unavailable',
      pingpay: pingpayAvailable ? 'available' : 'unavailable',
      eigenai: eigenaiAvailable ? 'available' : 'unavailable',
      teeWallet: teeWalletTool.isRunningInTEE() ? 'tee' : 'mock',
    },
    readiness: {
      ready: !isProduction || productionReadiness.ready,
      reasons: [
        ...runtime.errors,
        ...(isProduction ? productionReadiness.reasons : []),
      ],
    },
    metrics: {
      requests: requestCount,
      errors: errorCount,
    },
  };
}

/**
 * HTTP request handler
 */
const server = http.createServer(async (req, res) => {
  requestCount++;
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    
    // Health check endpoint
    if (url.pathname === '/health') {
      const health = await getHealthStatus();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(health, null, 2));
      return;
    }
    
    // Ready check endpoint (for Kubernetes/liveness probes)
    if (url.pathname === '/ready') {
      const health = await getHealthStatus();
      const isReady = health.readiness.ready;
      
      res.writeHead(isReady ? 200 : 503, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify(
          {
            ready: isReady,
            reasons: health.readiness.reasons,
            services: health.services,
          },
          null,
          2
        )
      );
      return;
    }
    
    // Webhook endpoint for Farcaster (if using webhooks instead of polling)
    if (url.pathname === '/webhook/farcaster' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const data = JSON.parse(body);
          
          // Verify webhook secret if configured
          const signature = req.headers['x-webhook-signature'];
          if (process.env.FARCASTER_WEBHOOK_SECRET && signature !== process.env.FARCASTER_WEBHOOK_SECRET) {
            res.writeHead(401);
            res.end(JSON.stringify({ error: 'Unauthorized' }));
            return;
          }
          
          // Process the webhook
          if (data.type === 'cast.created' && data.cast) {
            const cast = data.cast;
            
            // Check if bot is mentioned
            const botFid = parseInt(process.env.FARCASTER_BOT_FID || '0');
            const isMentioned = cast.mentioned_profiles?.some(
              (p: any) => p.fid === botFid
            );
            
            if (isMentioned) {
              const response = await processMessage({
                text: cast.text,
                author: cast.author.fid.toString(),
                type: 'cast',
              });
              
              // Reply via Farcaster client if available
              if (farcasterClient) {
                await farcasterClient.publishCast(`@${cast.author.username} ${response}`);
              }
            }
          }
          
          res.writeHead(200);
          res.end(JSON.stringify({ success: true }));
        } catch (error) {
          errorCount++;
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      });
      return;
    }
    
    // Process message endpoint (for testing)
    if (url.pathname === '/process' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const data = JSON.parse(body);
          const response = await processMessage({
            text: data.text || '',
            author: data.author || 'test',
            type: data.type || 'cast',
          });
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ response }, null, 2));
        } catch (error: any) {
          errorCount++;
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: error.message }));
        }
      });
      return;
    }
    
    // EigenAI grant balance endpoint
    if (url.pathname === '/eigenai/grant' && req.method === 'GET') {
      try {
        const grant = await eigenaiTool.checkGrant();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(grant, null, 2));
      } catch (error: any) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
      return;
    }
    
    // TEE wallet info endpoint
    if (url.pathname === '/tee/wallet' && req.method === 'GET') {
      const walletInfo = teeWalletTool.getWalletInfo();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(walletInfo, null, 2));
      return;
    }
    
    // Root endpoint - show info
    if (url.pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        name: 'GitSplits Agent',
        version: '1.0.0',
        description: 'Autonomous agent for compensating open source contributors',
        endpoints: {
          health: '/health',
          ready: '/ready',
          process: 'POST /process',
          webhook: 'POST /webhook/farcaster',
          eigenaiGrant: '/eigenai/grant',
          teeWallet: '/tee/wallet',
        },
        documentation: 'https://github.com/thisyearnofear/gitsplits',
      }, null, 2));
      return;
    }
    
    // 404 for unknown paths
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    
  } catch (error: any) {
    errorCount++;
    console.error('Server error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error.message }));
  }
});

/**
 * Graceful shutdown handler
 */
function gracefulShutdown(signal: string) {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  
  // Stop Farcaster client
  if (farcasterClient) {
    farcasterClient.stop();
  }
  
  // Close HTTP server
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
  
  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('⚠️ Forced shutdown');
    process.exit(1);
  }, 10000);
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
server.listen(PORT, async () => {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║              GitSplits Agent Server v1.0.0             ║');
  console.log('║       Autonomous Contributor Compensation Agent        ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`🌐 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log('');
  
  // Check environment
  const isMockMode = !isProductionMode();
  
  if (isMockMode) {
    console.log('🧪 MOCK MODE: Using simulated data');
    console.log('   - GitHub API: Mocked');
    console.log('   - NEAR Contract: Mocked');
    console.log('   - Ping Pay: Mocked');
  } else {
    console.log('🔌 PRODUCTION MODE');

    const runtime = validateRuntimeConfig();
    const readiness = validateProductionReadiness();
    if (runtime.errors.length > 0 || !readiness.ready) {
      console.error('❌ Production configuration is not ready:');
      [...runtime.errors, ...readiness.reasons].forEach((reason) =>
        console.error(`   - ${reason}`)
      );
      process.exit(1);
    }
    console.log('✅ Production configuration checks passed');
  }
  
  console.log('');
  
  // Initialize Farcaster client
  farcasterClient = createFarcasterClient();
  
  if (farcasterClient) {
    console.log('🔄 Initializing Farcaster client...');
    try {
      await farcasterClient.start();
      const profile = await farcasterClient.getBotProfile();
      if (profile) {
        console.log(`✅ Connected as @${profile.username}`);
      }
    } catch (error) {
      console.error('❌ Failed to initialize Farcaster:', error);
    }
  } else {
    console.log('ℹ️ Farcaster integration disabled (set NEYNAR_API_KEY to enable)');
  }
  
  console.log('');
  console.log('✅ Agent ready to process messages');
  console.log('');
});

export { server };
