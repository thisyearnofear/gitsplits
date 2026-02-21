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
    const apiBase = process.env.HOT_PAY_API_BASE || 'https://api.hot-labs.org';
    
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
    const merchantId = process.env.HOT_PAY_NEAR_ACCOUNT || 'papajams.near';
    const memo = `gitsplits-${params.splitId}-${Date.now()}`;

    // Create a partner payment item and use item_id as auditable payment reference.
    const response = await fetch(`${apiBase}/partners/merchant_item`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': jwt,
      },
      body: JSON.stringify({
        merchant_id: merchantId,
        memo,
        header: `GitSplits payout ${params.splitId}`,
        description: `Distribution for ${recipients.length} recipients`,
        token,
        amount,
        webhook_url: process.env.HOT_PAY_WEBHOOK_URL || '',
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HOT Pay error (${response.status}): ${error}`);
    }
    
    const result: any = await response.json();
    const itemId = result?.item_id || result?.id || '';
    
    return {
      txHash: itemId || '0x',
      intentId: itemId,
      paymentUrl: itemId
        ? `https://pay.hot-labs.org/payment?item_id=${itemId}&amount=${amount}`
        : undefined,
      status: result?.status || 'created',
      recipients: recipients.length,
      totalAmount: amount,
      token,
      memo,
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

    const apiBase = process.env.HOT_PAY_API_BASE || 'https://api.hot-labs.org';
    const response = await fetch(`${apiBase}/partners/processed_payments?limit=1`, {
      method: 'GET',
      headers: {
        'Authorization': jwt,
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
