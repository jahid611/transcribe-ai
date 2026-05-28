import { Hono } from 'hono';
import { and, eq } from 'drizzle-orm';
import { jobs } from '@transcribe-ai/db/schema';
import { getDb } from '../db';
import { authMiddleware, type AuthContext } from '../auth';
import type { Env } from '../env';

export const jobsRoute = new Hono<{
  Bindings: Env;
  Variables: { auth: AuthContext };
}>();

jobsRoute.use('*', authMiddleware);

jobsRoute.get('/:id', async (c) => {
  const id = c.req.param('id');
  const { user } = c.get('auth');
  const db = getDb(c.env);

  const [job] = await db
    .select()
    .from(jobs)
    .where(and(eq(jobs.id, id), eq(jobs.userId, user.id)))
    .limit(1);

  if (!job) return c.json({ error: { code: 'not_found' } }, 404);

  return c.json({
    id: job.id,
    status: job.status,
    progress: job.progress,
    status_label: job.statusLabel,
    file_name: job.fileName,
    duration_sec: job.durationSec,
    summary_id: job.summaryId,
    transcription_id: job.transcriptionId,
    error: job.error,
    created_at: job.createdAt,
    started_at: job.startedAt,
    finished_at: job.finishedAt,
  });
});

jobsRoute.post('/:id/cancel', async (c) => {
  const id = c.req.param('id');
  const { user } = c.get('auth');
  const db = getDb(c.env);

  const [job] = await db
    .select()
    .from(jobs)
    .where(and(eq(jobs.id, id), eq(jobs.userId, user.id)))
    .limit(1);

  if (!job) return c.json({ error: { code: 'not_found' } }, 404);

  if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
    return c.json({ error: { code: 'not_cancellable', message: `Job déjà ${job.status}` } }, 409);
  }

  // Annulation autorisée uniquement dans les 30 premières secondes.
  const ageMs = Date.now() - job.createdAt.getTime();
  if (ageMs > 30_000) {
    return c.json(
      { error: { code: 'too_late', message: 'Annulation possible seulement < 30s' } },
      409,
    );
  }

  await db
    .update(jobs)
    .set({ status: 'cancelled', statusLabel: 'Annulé', finishedAt: new Date() })
    .where(eq(jobs.id, id));

  return c.json({ id, status: 'cancelled' });
});
