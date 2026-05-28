import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { getLimits } from '@transcribe-ai/shared';
import { summaries, usageEvents } from '@transcribe-ai/db/schema';
import { getDb } from '../db';
import { authMiddleware, type AuthContext } from '../auth';
import type { Env } from '../env';

export const meRoute = new Hono<{
  Bindings: Env;
  Variables: { auth: AuthContext };
}>();

meRoute.use('*', authMiddleware);

meRoute.get('/', async (c) => {
  const { user } = c.get('auth');
  const db = getDb(c.env);
  const limits = getLimits(user.tier);

  const summaryRows: { createdAt: Date; costUsd: number }[] = await db
    .select({ createdAt: summaries.createdAt, costUsd: summaries.costUsd })
    .from(summaries)
    .where(eq(summaries.userId, user.id));

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(startOfDay.getFullYear(), startOfDay.getMonth(), 1);

  const sessionsToday = summaryRows.filter((r: { createdAt: Date }) => r.createdAt >= startOfDay).length;
  const llmCostThisMonth = summaryRows
    .filter((r: { createdAt: Date }) => r.createdAt >= startOfMonth)
    .reduce((s: number, r: { costUsd: number }) => s + r.costUsd, 0);

  void usageEvents;

  return c.json({
    id: user.id,
    email: user.email,
    name: user.name,
    tier: user.tier,
    created_at: user.createdAt,
    usage: {
      sessions_today: sessionsToday,
      sessions_limit:
        limits.maxSessionsPerDay === Infinity ? null : limits.maxSessionsPerDay,
      llm_cost_this_month_usd: Number(llmCostThisMonth.toFixed(4)),
      llm_cost_cap_usd: limits.llmCostCapUsd === Infinity ? null : limits.llmCostCapUsd,
    },
    limits: {
      can_upload: limits.canUploadFile,
      can_export_pdf: limits.canExportPdf,
      can_export_docx: limits.canExportDocx,
      max_file_size_mb: limits.maxFileSizeMB,
    },
  });
});
