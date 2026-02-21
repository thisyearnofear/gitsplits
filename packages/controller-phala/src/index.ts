import dotenv from 'dotenv';
import http from 'http';
import { GitSplitsController } from './agent';
import { createFarcasterClient } from './services/farcaster';
import {
  startCanaryMonitor,
  stopCanaryMonitor,
  getLastCanaryResult,
  runCanaryOnce,
} from './services/canary-monitor';
import { getTelemetryPath } from './agentic/telemetry';
import {
  getGitHubAuthMode,
  isProductionMode,
  validateProductionReadiness,
  validateRuntimeConfig,
} from '@gitsplits/shared';
import { eigenaiTool } from './tools/eigenai';
import { teeWalletTool } from './tools/tee-wallet';

dotenv.config();

/**
 * Sovereign Controller Entry Point
 * Runs entirely on Phala Network (dstack) or local simulator.
 */

const PORT = process.env.PORT || 3000;

// Track server state
let farcasterClient: ReturnType<typeof createFarcasterClient> = null;
let startTime = Date.now();
let requestCount = 0;
let errorCount = 0;

const config = {
  workerUrl: '', // Deprecated in monolith
  workerApiKey: '',
  nearAccountId: process.env.NEAR_ACCOUNT_ID || '',
  nearPrivateKey: process.env.NEAR_PRIVATE_KEY || '',
  nearNetworkId: (process.env.NEAR_NETWORK_ID as 'mainnet' | 'testnet') || 'testnet',
};

function isAuthorizedProcessRequest(req: http.IncomingMessage): boolean {
  const expected = process.env.AGENT_SERVER_API_KEY;
  if (!expected) return true;
  const provided = req.headers['x-agent-api-key'];
  return typeof provided === 'string' && provided === expected;
}

async function getHealthStatus() {
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
      runtime.errors.length === 0 && (!isProduction || productionReadiness.ready)
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
    compute: teeWalletTool.isRunningInTEE() ? 'Secure TEE (Phala dstack)' : 'Standard (Local)',
    technologyStack: {
      social: 'Farcaster (Neynar API)',
      automation: 'GitHub App (v3 REST)',
      blockchain: 'NEAR Mainnet (Chain Signatures)',
      settlement: 'NEAR Intents (Ping Pay)',
      verifiability: 'EigenAI deTERMinal (External API)',
    },
    readiness: {
      ready: !isProduction || productionReadiness.ready,
      reasons: [...runtime.errors, ...(isProduction ? productionReadiness.reasons : [])],
    },
    metrics: {
      requests: requestCount,
      errors: errorCount,
    },
  };
}

async function startServer() {
  const controller = new GitSplitsController(config);

  try {
    // Initialize NEAR connection and sovereign identity
    await controller.initialize();
  } catch (error) {
    console.error('❌ Failed to initialize GitSplits Controller:', error);
    process.exit(1);
  }

  const server = http.createServer(async (req, res) => {
    requestCount++;

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-agent-api-key, x-webhook-signature');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    try {
      const url = new URL(req.url || '/', `http://${req.headers.host}`);

      // Health check endpoint
      if (url.pathname === '/health' && req.method === 'GET') {
        const health = await getHealthStatus();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(health, null, 2));
        return;
      }

      // Ready check endpoint (for Kubernetes/liveness probes)
      if (url.pathname === '/ready' && req.method === 'GET') {
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

      // Process user requests (from UI)
      if (url.pathname === '/process' && req.method === 'POST') {
        if (!isAuthorizedProcessRequest(req)) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Unauthorized' }));
          return;
        }

        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const message = JSON.parse(body);
            const response = await controller.handleUserRequest(message);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ response }));
          } catch (error: any) {
            errorCount++;
            console.error('[Controller] Error handling process request:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
          }
        });
        return;
      }

      // Farcaster Webhook
      if (url.pathname === '/webhook/farcaster' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const data = JSON.parse(body);

            // Verify webhook secret
            const signature = req.headers['x-webhook-signature'];
            if (process.env.FARCASTER_WEBHOOK_SECRET && signature !== process.env.FARCASTER_WEBHOOK_SECRET) {
              res.writeHead(401);
              res.end(JSON.stringify({ error: 'Unauthorized' }));
              return;
            }

            if (data.type === 'cast.created' && data.cast) {
              const cast = data.cast;
              const botFid = parseInt(process.env.FARCASTER_BOT_FID || '0');
              const isMentioned = cast.mentioned_profiles?.some((p: any) => p.fid === botFid);

              if (isMentioned) {
                const response = await controller.handleUserRequest({
                  text: cast.text,
                  author: cast.author.fid.toString(),
                  type: 'cast',
                });

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

      // EigenAI Grant Checking
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

      // Canary Operations
      if (url.pathname === '/canary' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify(
            {
              result: getLastCanaryResult(),
              logFile: getTelemetryPath(),
            },
            null,
            2
          )
        );
        return;
      }

      if (url.pathname === '/canary/run' && req.method === 'POST') {
        try {
          const result = await runCanaryOnce();
          res.writeHead(result.ok ? 200 : 503, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result, null, 2));
        } catch (error: any) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: error.message }));
        }
        return;
      }

      // Root endpoint
      if (url.pathname === '/' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          name: 'GitSplits Sovereign Agent',
          version: '1.0.0',
          description: 'Autonomous monolith agent for compensating open source contributors',
          endpoints: {
            health: '/health',
            ready: '/ready',
            process: 'POST /process',
            webhook: 'POST /webhook/farcaster',
            eigenaiGrant: '/eigenai/grant',
            canary: '/canary',
            runCanary: 'POST /canary/run',
          },
        }, null, 2));
        return;
      }

      // Default 404
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not Found' }));

    } catch (error: any) {
      errorCount++;
      console.error('Server error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
  });

  function gracefulShutdown(signal: string) {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    if (farcasterClient) {
      farcasterClient.stop();
    }
    stopCanaryMonitor();
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });
    setTimeout(() => {
      console.error('⚠️ Forced shutdown');
      process.exit(1);
    }, 10000);
  }

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  server.listen(PORT, async () => {
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║           GitSplits Sovereign Controller               ║');
    console.log('║              Running on Phala (dstack)                 ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log(`🌐 Server running on port ${PORT}`);
    console.log(`💼 NEAR Account: ${config.nearAccountId}`);
    console.log('');

    const isMockMode = !isProductionMode();
    if (isMockMode) {
      console.log('🧪 MOCK MODE: Using simulated data where credentials lack.');
    } else {
      console.log('🔌 PRODUCTION MODE');
      const runtime = validateRuntimeConfig();
      const readiness = validateProductionReadiness();
      if (runtime.errors.length > 0 || !readiness.ready) {
        console.error('❌ Production configuration is incomplete:');
        [...runtime.errors, ...readiness.reasons].forEach((reason) => console.error(`   - ${reason}`));
      } else {
        console.log('✅ Production configuration verified.');
      }
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
    }

    startCanaryMonitor();

    console.log('');
    console.log('✅ Sovereign Agent ready to process messages');
  });
}

startServer().catch(err => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
