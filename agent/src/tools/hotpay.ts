/**
 * HOT Pay Tool
 * 
 * Executes payments via HOT Pay Partner API.
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

export const hotpayTool = {
  name: 'hotpay',
  
  async distribute(params: DistributionParams) {
    const jwt = process.env.HOT_PAY_JWT;
    
    // Mock mode if HOT Pay not configured
    if (!jwt || jwt === 'placeholder') {
      if (process.env.AGENT_MODE === 'production') {
        throw new Error('[HOTPay] Missing HOT_PAY_JWT in production mode');
      }
      console.log('[HOTPay] Mock mode - no API call made');
      return {
        txHash: `0x${Math.random().toString(36).substring(2, 34)}`,
        status: 'completed',
        recipients: params.recipients.length,
        totalAmount: params.amount,
        token: params.token,
        mock: true,
      };
    }
    
    const { amount, token, recipients } = params;
    
    // Calculate individual amounts based on percentages
    const distributions = recipients.map((r) => ({
      address: r.wallet,
      amount: (amount * r.percentage) / 100,
    }));
    
    // Create payment via HOT Pay API
    // Using https://pay.hot-labs.org as indicated in the JWT domain
    const response = await fetch('https://pay.hot-labs.org/api/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwt}`,
        'x-api-key': process.env.HOT_PAY_API_KEY || '',
      },
      body: JSON.stringify({
        partner_id: process.env.HOT_PAY_NEAR_ACCOUNT || 'papajams.near',
        token,
        amount,
        recipients: distributions,
        metadata: {
          split_id: params.splitId,
          source: 'gitsplits-agent'
        }
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HOT Pay error: ${error}`);
    }
    
    const result: any = await response.json();
    
    return {
      txHash: result?.transaction_hash || result?.id || '0x',
      status: result?.status || 'pending',
      recipients: distributions.length,
      totalAmount: amount,
      token,
    };
  },
  
  async probeAuth() {
    const jwt = process.env.HOT_PAY_JWT;
    if (!jwt || jwt === 'placeholder') {
      if (process.env.AGENT_MODE === 'production') {
        throw new Error('[HOTPay] Missing HOT_PAY_JWT in production mode');
      }
      return { ok: true, mock: true };
    }

    // Basic probe to check if JWT is valid
    const response = await fetch('https://pay.hot-labs.org/api/v1/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'x-api-key': process.env.HOT_PAY_API_KEY || '',
      },
    });

    if (response.status === 401 || response.status === 403) {
      throw new Error(`[HOTPay] Authentication failed with status ${response.status}`);
    }

    return {
      ok: true,
      status: response.status,
    };
  },
};
