import { Hono } from 'hono';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { and, desc, eq } from 'drizzle-orm';
import {
  buildRouterFromEnv,
  getSummarySystemPrompt,
  wrapTranscript,
} from '@transcribe-ai/llm-router';
import { SummarySchema, getLimits, QuotaExceededError } from '@transcribe-ai/shared';
import { sessions, summaries, usageEvents } from '@transcribe-ai/db/schema';
import { getDb } from '../db';
import { authMiddleware, type AuthContext } from '../auth';
import type { Env } from '../env';

const CreateBody = z.object({
  transcript: z.string().min(1).max(500_000),
  language: z.enum(['fr', 'en']).default('fr'),
  title: z.string().max(200).optional(),
  durationSec: z.number().int().nonnegative().default(0),
  source: z.enum(['live', 'upload']).default('live'),
});

export const summariesRoute = new Hono<{
  Bindings: Env;
  Variables: { auth: AuthContext };
}>();

summariesRoute.use('*', authMiddleware);

summariesRoute.post('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = CreateBody.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: { code: 'invalid_body', details: parsed.error.flatten() } }, 400);
  }

  const { user } = c.get('auth');
  const limits = getLimits(user.tier);
  const db = getDb(c.env);

  const startOfMonth = startOfMonthEpoch();
  const monthCost = await sumMonthlyLlmCost(db, user.id, startOfMonth);
  if (monthCost >= limits.llmCostCapUsd) {
    return c.json(
      { error: { code: 'quota_exceeded', message: 'LLM monthly cost cap reached' } },
      429,
    );
  }

  const router = buildRouterFromEnv(c.env);
  let result;
  try {
    result = await router.summarize(
      [
        { role: 'system', content: getSummarySystemPrompt(parsed.data.language) },
        { role: 'user', content: wrapTranscript(parsed.data.transcript) },
      ],
      { jsonMode: true, temperature: 0.3, maxTokens: 1500 },
    );
  } catch (err) {
    return c.json(
      {
        error: {
          code: 'llm_failed',
          message: err instanceof Error ? err.message : 'Unknown',
        },
      },
      502,
    );
  }

  const parsedSummary = SummarySchema.safeParse(result.json ?? safeJsonParse(result.text));
  if (!parsedSummary.success) {
    return c.json(
      { error: { code: 'invalid_summary', details: parsedSummary.error.flatten() } },
      502,
    );
  }

  const sessionId = nanoid();
  const summaryId = nanoid();
  const now = new Date();

  await db.insert(sessions).values({
    id: sessionId,
    userId: user.id,
    title: parsed.data.title ?? parsedSummary.data.title,
    language: parsed.data.language,
    transcript: parsed.data.transcript,
    durationSec: parsed.data.durationSec,
    source: parsed.data.source,
    summaryId,
    createdAt: now,
  });

  await db.insert(summaries).values({
    id: summaryId,
    sessionId,
    userId: user.id,
    language: parsed.data.language,
    model: result.model,
    provider: result.provider,
    payload: parsedSummary.data,
    inputTokens: result.usage.inputTokens,
    outputTokens: result.usage.outputTokens,
    costUsd: result.costUsd,
    createdAt: now,
  });

  await db.insert(usageEvents).values({
    id: nanoid(),
    userId: user.id,
    kind: 'llm.summary',
    costUsd: result.costUsd,
    createdAt: now,
  });

  return c.json(
    {
      id: summaryId,
      session_id: sessionId,
      summary: parsedSummary.data,
      provider: result.provider,
      model: result.model,
      cost_usd: result.costUsd,
      latency_ms: result.latencyMs,
    },
    201,
  );
});

summariesRoute.get('/', async (c) => {
  const { user } = c.get('auth');
  const db = getDb(c.env);
  const rows = await db
    .select({
      id: summaries.id,
      sessionId: summaries.sessionId,
      payload: summaries.payload,
      createdAt: summaries.createdAt,
      provider: summaries.provider,
      model: summaries.model,
      costUsd: summaries.costUsd,
    })
    .from(summaries)
    .where(eq(summaries.userId, user.id))
    .orderBy(desc(summaries.createdAt))
    .limit(50);
  return c.json({ data: rows });
});

summariesRoute.get('/:id', async (c) => {
  const id = c.req.param('id');
  const { user } = c.get('auth');
  const db = getDb(c.env);
  const [row] = await db
    .select()
    .from(summaries)
    .where(and(eq(summaries.id, id), eq(summaries.userId, user.id)))
    .limit(1);
  if (!row) return c.json({ error: { code: 'not_found' } }, 404);

  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, row.sessionId))
    .limit(1);

  return c.json({
    id: row.id,
    session_id: row.sessionId,
    transcript: session?.transcript ?? '',
    duration_sec: session?.durationSec ?? 0,
    payload: row.payload,
    provider: row.provider,
    model: row.model,
    cost_usd: row.costUsd,
    created_at: row.createdAt,
  });
});

summariesRoute.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const { user } = c.get('auth');
  const db = getDb(c.env);
  const [row] = await db
    .select({ sessionId: summaries.sessionId })
    .from(summaries)
    .where(and(eq(summaries.id, id), eq(summaries.userId, user.id)))
    .limit(1);
  if (!row) return c.json({ error: { code: 'not_found' } }, 404);
  await db.delete(sessions).where(eq(sessions.id, row.sessionId));
  return c.body(null, 204);
});

function startOfMonthEpoch(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

async function sumMonthlyLlmCost(
  db: ReturnType<typeof getDb>,
  userId: string,
  since: Date,
): Promise<number> {
  const rows: { costUsd: number; createdAt: Date }[] = await db
    .select({ costUsd: usageEvents.costUsd, createdAt: usageEvents.createdAt })
    .from(usageEvents)
    .where(eq(usageEvents.userId, userId));
  return rows
    .filter((r: { createdAt: Date; costUsd: number }) => r.createdAt >= since && r.costUsd > 0)
    .reduce((s: number, r: { costUsd: number }) => s + r.costUsd, 0);
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
