import { SafetyAlert } from './types';

export interface RecipientSnapshot {
  github_username: string;
  percentage: number;
  wallet?: string | null;
}

function isBot(username: string): boolean {
  const normalized = String(username || '').toLowerCase();
  return normalized.includes('[bot]') || normalized.endsWith('-bot');
}

export function inspectDistributionRisk(recipients: RecipientSnapshot[]): SafetyAlert[] {
  const alerts: SafetyAlert[] = [];
  if (!recipients.length) {
    alerts.push({
      level: 'high',
      code: 'NO_RECIPIENTS',
      message: 'No recipients were resolved for this distribution.',
    });
    return alerts;
  }

  const botShare = recipients
    .filter((r) => isBot(r.github_username))
    .reduce((sum, r) => sum + Number(r.percentage || 0), 0);
  if (botShare >= 50) {
    alerts.push({
      level: 'high',
      code: 'BOT_HEAVY',
      message: `Bot/system contributors account for ${botShare.toFixed(1)}% of allocation.`,
    });
  }

  const maxShare = Math.max(...recipients.map((r) => Number(r.percentage || 0)));
  if (recipients.length >= 3 && maxShare >= 95) {
    alerts.push({
      level: 'medium',
      code: 'OUTLIER_SHARE',
      message: `One recipient has ${maxShare.toFixed(1)}% share; review before paying.`,
    });
  }

  const missingWallets = recipients.filter((r) => !r.wallet).length;
  if (missingWallets > 0) {
    alerts.push({
      level: 'low',
      code: 'MISSING_WALLETS',
      message: `${missingWallets} recipients are missing verified wallets and will not be paid now.`,
    });
  }

  return alerts;
}

export function shouldBlockForSafety(alerts: SafetyAlert[], overrideText?: string): boolean {
  const hasHigh = alerts.some((a) => a.level === 'high');
  if (!hasHigh) return false;

  const override = String(overrideText || '').toLowerCase();
  return !(override.includes('override safety') || override.includes('force pay'));
}
