interface DistributionParams {
  splitId: string;
  amount: number;
  token: string;
  recipients: Array<{
    wallet: string;
    percentage: number;
  }>;
}

interface DistributionResult {
  txHash: string;
  intentId?: string;
  status?: string;
  recipients?: number;
  totalAmount?: number;
  token?: string;
  engine: 'hotpay' | 'pingpay' | 'hotpay_fallback';
  protocol: string;
}

function shouldPreferHotPay(token: string, hintText?: string): boolean {
  const normalizedToken = String(token || '').toUpperCase();
  if (normalizedToken === 'NEAR') return true;
  return String(hintText || '').toLowerCase().includes('hotpay');
}

export const paymentOrchestratorTool = {
  name: 'payment-orchestrator',

  async distribute(
    params: DistributionParams,
    context: any,
    tools: any
  ): Promise<DistributionResult> {
    const preferHotPay = shouldPreferHotPay(params.token, context?.message?.text);

    if (preferHotPay) {
      const hot = await tools.hotpay.distribute(params);
      return {
        ...hot,
        engine: 'hotpay',
        protocol: 'HOT Partner API',
      };
    }

    try {
      const ping = await tools.pingpay.distribute(params);
      return {
        ...ping,
        engine: 'pingpay',
        protocol: 'NEAR Intents & Chain Signatures',
      };
    } catch (pingErr: any) {
      if (!process.env.HOT_PAY_JWT) {
        throw pingErr;
      }
      console.log(
        `[PaymentOrchestrator] Ping Pay failed (${pingErr?.message || 'unknown'}), falling back to HOT Pay`
      );
      const hot = await tools.hotpay.distribute(params);
      return {
        ...hot,
        engine: 'hotpay_fallback',
        protocol: 'HOT Partner API',
      };
    }
  },
};
