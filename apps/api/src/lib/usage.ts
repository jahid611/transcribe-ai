import { eq } from 'drizzle-orm';
import { usageEvents, usageLogs } from '@transcribe-ai/db/schema';
import type { getDb } from '../db';

type Db = ReturnType<typeof getDb>;

export function startOfMonth(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** Coût LLM+Whisper cumulé du mois courant (usage_events + usage_logs). */
export async function monthlyCostUsd(db: Db, userId: string): Promise<number> {
  const since = startOfMonth();

  const events: { costUsd: number; createdAt: Date }[] = await db
    .select({ costUsd: usageEvents.costUsd, createdAt: usageEvents.createdAt })
    .from(usageEvents)
    .where(eq(usageEvents.userId, userId));

  const logs: { totalCostUsd: number; createdAt: Date }[] = await db
    .select({ totalCostUsd: usageLogs.totalCostUsd, createdAt: usageLogs.createdAt })
    .from(usageLogs)
    .where(eq(usageLogs.userId, userId));

  const evCost = events
    .filter((r) => r.createdAt >= since)
    .reduce((s, r) => s + r.costUsd, 0);
  const logCost = logs
    .filter((r) => r.createdAt >= since)
    .reduce((s, r) => s + r.totalCostUsd, 0);

  return evCost + logCost;
}
