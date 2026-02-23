/**
 * Ping Pay Tool
 * 
 * Executes cross-chain payments via NEAR Intents.
 */

interface DistributionParams {
  splitId: string;
  amount: number;
  token: string;
  recipients: Array<{
    wallet: string;
    percentage: number;
  }>;
}

function getAuthHeaders(): Record<string, string> {
  const apiKey = process.env.PING_PAY_API_KEY || '';
  const explicitMode = (process.env.PING_PAY_AUTH_MODE || '').toLowerCase();
  const usePublishable =
    explicitMode === 'publishable' || (!explicitMode && apiKey.startsWith('pk_'));

  if (usePublishable) {
    return { 'x-publishable-key': apiKey };
  }

  return { Authorization: `Bearer ${apiKey}` };
}

export const pingpayTool = {
  name: 'pingpay',
  
  async distribute(params: DistributionParams) {
    const apiBase = process.env.PING_PAY_API_BASE || 'https://api.pingpay.io';
    const intentsPath = process.env.PING_PAY_INTENTS_PATH || '/v1/intents';

    // Mock mode if Ping Pay not configured (only allowed outside production)
    if (!process.env.PING_PAY_API_KEY || process.env.PING_PAY_API_KEY === 'placeholder') {
      if (process.env.AGENT_MODE === 'production') {
        throw new Error('[PingPay] Missing PING_PAY_API_KEY in production mode');
      }
      console.log('[PingPay] Mock mode - no API call made');
      return {
        txHash: `0x${Math.random().toString(36).substring(2, 34)}`,
        intentId: `intent-${Math.random().toString(36).substring(2, 10)}`,
        status: 'completed',
        recipients: params.recipients.length,
        totalAmount: params.amount,
        token: params.token,
        mock: true,
      };
    }
    
    const { splitId, amount, token, recipients } = params;
    
    // Calculate individual amounts based on percentages
    const distributions = recipients.map((r) => ({
      wallet: r.wallet,
      amount: (amount * r.percentage) / 100,
    }));
    
    // Create NEAR Intent via Ping Pay API
    const response = await fetch(`${apiBase}${intentsPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({
        action: 'distribute',
        split_id: splitId,
        token,
        total_amount: amount,
        recipients: distributions.map((d) => ({
          address: d.wallet,
          amount: d.amount,
        })),
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ping Pay error (${response.status}): ${error || response.statusText}`);
    }
    
    const result: any = await response.json();
    
    return {
      txHash: result?.transaction_hash || '0x',
      intentId: result?.intent_id || '',
      status: result?.status || 'pending',
      recipients: distributions.length,
      totalAmount: amount,
      token,
      protocol: 'NEAR Intents',
    };
  },
  
  async getStatus(intentId: string) {
    const apiBase = process.env.PING_PAY_API_BASE || 'https://api.pingpay.io';
    const intentsPath = process.env.PING_PAY_INTENTS_PATH || '/v1/intents';

    if (!process.env.PING_PAY_API_KEY || process.env.PING_PAY_API_KEY === 'placeholder') {
      if (process.env.AGENT_MODE === 'production') {
        throw new Error('[PingPay] Missing PING_PAY_API_KEY in production mode');
      }
      return { status: 'completed', intentId, mock: true };
    }
    
    const response = await fetch(`${apiBase}${intentsPath}/${intentId}`, {
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `Failed to fetch intent status (${response.status}): ${error || response.statusText}`
      );
    }
    
    return await response.json();
  },

  async probeAuth() {
    const apiBase = process.env.PING_PAY_API_BASE || 'https://api.pingpay.io';
    const probePath = process.env.PING_PAY_PROBE_PATH || '/v1/intents/probe';
    const probeMethod = (process.env.PING_PAY_PROBE_METHOD || 'GET').toUpperCase();
    const probeBody = process.env.PING_PAY_PROBE_BODY;

    if (!process.env.PING_PAY_API_KEY || process.env.PING_PAY_API_KEY === 'placeholder') {
      if (process.env.AGENT_MODE === 'production') {
        throw new Error('[PingPay] Missing PING_PAY_API_KEY in production mode');
      }
      return { ok: true, mock: true };
    }

    const response = await fetch(`${apiBase}${probePath}`, {
      method: probeMethod,
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: probeMethod === 'GET' ? undefined : probeBody,
    });

    if (!response.ok) {
      const body = await response.text();
      if (response.status === 401 || response.status === 403) {
        throw new Error(`[PingPay] Authentication failed with status ${response.status}`);
      }
      if (response.status === 404) {
        return {
          ok: true,
          status: response.status,
          warning:
            `[PingPay] Probe path returned 404 (${apiBase}${probePath}). ` +
            `Auth may still be valid; set PING_PAY_PROBE_PATH for your current API.`,
        };
      }
      throw new Error(
        `[PingPay] Probe failed with status ${response.status}: ${body || response.statusText}`
      );
    }

    return {
      ok: true,
      status: response.status,
    };
  },
};
