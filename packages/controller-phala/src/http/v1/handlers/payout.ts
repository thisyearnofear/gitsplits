import { nearTool } from '../../../tools/near';
import { pingpayTool } from '../../../tools/pingpay';
import { hotpayTool } from '../../../tools/hotpay';
import { paymentOrchestratorTool } from '../../../agentic/payment-orchestrator';
import { TPayoutDistributeRequest, TPayoutPendingRequest } from '../schemas';

function assertRecipientsSum(recipients: Array<{ percentage: number }>) {
  const total = recipients.reduce((sum, r) => sum + Number(r.percentage || 0), 0);
  if (total < 99 || total > 101) {
    throw Object.assign(new Error(`Recipient percentages sum to ${total}, expected 100`), {
      statusCode: 400,
      code: 'invalid_recipient_percentages',
    });
  }
}

export async function distributePayout(req: TPayoutDistributeRequest) {
  assertRecipientsSum(req.recipients);

  const tools = {
    near: nearTool,
    pingpay: pingpayTool,
    hotpay: hotpayTool,
  };

  const context: any = { message: { text: req.preferEngine === 'hotpay' ? 'hotpay' : '' } };

  const result = await paymentOrchestratorTool.distribute(
    {
      splitId: req.splitId,
      amount: req.amount,
      token: req.token,
      recipients: req.recipients,
    },
    context,
    tools
  );

  return {
    splitId: req.splitId,
    amount: req.amount,
    token: req.token,
    recipients: req.recipients.length,
    engine: result.engine,
    protocol: result.protocol,
    txHash: result.txHash,
    intentId: result.intentId ?? null,
    status: result.status ?? 'submitted',
  };
}

export async function storePendingPayout(req: TPayoutPendingRequest) {
  const pendingId = await nearTool.storePendingDistribution({
    githubUsername: req.githubUsername,
    amount: req.amount,
    token: req.token,
  });
  return {
    pendingId,
    githubUsername: req.githubUsername,
    amount: req.amount,
    token: req.token,
  };
}
