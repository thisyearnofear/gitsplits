import { teeWalletTool } from '../../../tools/tee-wallet';
import { TAttestDistributionRequest } from '../schemas';

export async function attestDistribution(req: TAttestDistributionRequest) {
  const payload = JSON.stringify({
    splitId: req.splitId,
    txHash: req.txHash,
    summary: req.summary,
    issuedAt: new Date().toISOString(),
  });

  const { signature, address } = await teeWalletTool.signMessage(payload);

  return {
    splitId: req.splitId,
    txHash: req.txHash,
    attestation: {
      payload,
      signature,
      signer: address,
      isTee: teeWalletTool.isRunningInTEE(),
    },
  };
}
