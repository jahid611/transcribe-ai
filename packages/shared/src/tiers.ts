export type Tier = 'free' | 'pro' | 'enterprise';

export const TIER_LIMITS = {
  free: {
    maxSessionDurationSec: 30 * 60,
    maxSessionsPerDay: 5,
    maxFileSizeMB: 0,
    canUploadFile: false,
    canExportPdf: false,
    canExportDocx: false,
    llmCostCapUsd: 0.3,
    storageGB: 0,
  },
  pro: {
    maxSessionDurationSec: Infinity,
    maxSessionsPerDay: 100,
    maxFileSizeMB: 500,
    canUploadFile: true,
    canExportPdf: true,
    canExportDocx: true,
    llmCostCapUsd: 5,
    storageGB: 50,
  },
  enterprise: {
    maxSessionDurationSec: Infinity,
    maxSessionsPerDay: Infinity,
    maxFileSizeMB: 5120,
    canUploadFile: true,
    canExportPdf: true,
    canExportDocx: true,
    llmCostCapUsd: Infinity,
    storageGB: Infinity,
  },
} as const satisfies Record<Tier, unknown>;

export function getLimits(tier: Tier) {
  return TIER_LIMITS[tier];
}
