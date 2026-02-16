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

export const pingpayTool = {
  name: 'pingpay',
  
  async distribute(params: DistributionParams) {
    // Mock mode if Ping Pay not configured
    if (!process.env.PING_PAY_API_KEY || process.env.PING_PAY_API_KEY === 'placeholder') {
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
    const response = await fetch('https://api.pingpay.io/v1/intents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.PING_PAY_API_KEY}`,
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
      throw new Error(`Ping Pay error: ${error}`);
    }
    
    const result: any = await response.json();
    
    return {
      txHash: result?.transaction_hash || '0x',
      intentId: result?.intent_id || '',
      status: result?.status || 'pending',
      recipients: distributions.length,
      totalAmount: amount,
      token,
    };
  },
  
  async getStatus(intentId: string) {
    if (!process.env.PING_PAY_API_KEY || process.env.PING_PAY_API_KEY === 'placeholder') {
      return { status: 'completed', intentId, mock: true };
    }
    
    const response = await fetch(`https://api.pingpay.io/v1/intents/${intentId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.PING_PAY_API_KEY}`,
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch intent status');
    }
    
    return await response.json();
  },
};
