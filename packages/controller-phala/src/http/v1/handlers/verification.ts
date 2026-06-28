import { nearTool } from '../../../tools/near';
import { TVerificationCheckRequest, TVerificationStoreRequest } from '../schemas';

export async function checkVerification(req: TVerificationCheckRequest) {
  const wallets = await Promise.all(
    req.githubUsernames.map((u) => nearTool.getVerifiedWallet(u))
  );

  const verified: Record<string, string> = {};
  const unverified: string[] = [];

  req.githubUsernames.forEach((username, idx) => {
    const wallet = wallets[idx];
    if (wallet) {
      verified[username] = wallet as string;
    } else {
      unverified.push(username);
    }
  });

  return {
    verified,
    unverified,
    counts: {
      total: req.githubUsernames.length,
      verified: Object.keys(verified).length,
      unverified: unverified.length,
    },
  };
}

export async function storeVerification(req: TVerificationStoreRequest) {
  const result = await nearTool.storeVerification({
    githubUsername: req.githubUsername,
    walletAddress: req.walletAddress,
    xUsername: req.xUsername,
  });

  return { ok: true, githubUsername: req.githubUsername, walletAddress: req.walletAddress, raw: result };
}
