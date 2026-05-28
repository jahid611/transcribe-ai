import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { getLimits, isAcceptedAudio, maxUploadBytes, MB } from '@transcribe-ai/shared';
import { jobs } from '@transcribe-ai/db/schema';
import { getDb } from '../db';
import { authMiddleware, type AuthContext } from '../auth';
import { buildAudioKey, putAudio } from '../lib/r2';
import { enqueueTranscribeJob } from '../lib/queue';
import { monthlyCostUsd } from '../lib/usage';
import type { Env } from '../env';

export const transcribeRoute = new Hono<{
  Bindings: Env;
  Variables: { auth: AuthContext };
}>();

transcribeRoute.use('*', authMiddleware);

transcribeRoute.post('/upload', async (c) => {
  const { user } = c.get('auth');
  const limits = getLimits(user.tier);

  if (!limits.canUploadFile) {
    return c.json(
      { error: { code: 'forbidden', message: 'Upload non disponible pour votre tier' } },
      403,
    );
  }

  // Vérifie le cap de coût mensuel avant d'accepter le travail (COST_MODEL.md).
  const db = getDb(c.env);
  const spent = await monthlyCostUsd(db, user.id);
  if (spent >= limits.llmCostCapUsd) {
    return c.json(
      {
        error: {
          code: 'quota_exceeded',
          message: 'Plafond de coût mensuel atteint',
          details: { spent_usd: Number(spent.toFixed(4)), cap_usd: limits.llmCostCapUsd },
        },
      },
      429,
    );
  }

  let form: FormData;
  try {
    form = await c.req.formData();
  } catch {
    return c.json({ error: { code: 'invalid_body', message: 'multipart/form-data attendu' } }, 400);
  }

  const file = form.get('file');
  const language = (form.get('language')?.toString() === 'en' ? 'en' : 'fr') as 'fr' | 'en';

  if (!(file instanceof File)) {
    return c.json({ error: { code: 'no_file', message: 'Champ "file" manquant' } }, 400);
  }

  if (!isAcceptedAudio(file.name, file.type)) {
    return c.json(
      {
        error: {
          code: 'unsupported_format',
          message: 'Format non supporté (mp3, mp4, wav, m4a, webm)',
        },
      },
      415,
    );
  }

  const maxBytes = maxUploadBytes(user.tier);
  if (file.size > maxBytes) {
    return c.json(
      {
        error: {
          code: 'file_too_large',
          message: `Fichier trop volumineux pour le tier ${user.tier}`,
          details: { size_mb: +(file.size / MB).toFixed(2), max_mb: limits.maxFileSizeMB },
        },
      },
      413,
    );
  }

  const jobId = nanoid();
  const r2Key = buildAudioKey(user.id, jobId, file.name);
  const buffer = await file.arrayBuffer();

  await putAudio(c.env, r2Key, buffer, file.type || 'application/octet-stream');

  await db.insert(jobs).values({
    id: jobId,
    userId: user.id,
    tier: user.tier,
    type: 'transcribe',
    status: 'queued',
    progress: 0,
    statusLabel: 'En file d’attente…',
    r2Key,
    fileName: file.name,
    fileSizeBytes: file.size,
    language,
  });

  let execCtx: ExecutionContext | undefined;
  try {
    execCtx = c.executionCtx;
  } catch {
    execCtx = undefined; // Node : pas d'executionCtx, traitement inline direct.
  }

  const enq = await enqueueTranscribeJob(c.env, execCtx, jobId, user.tier);

  if (enq.messageId) {
    await db.update(jobs).set({ qstashMessageId: enq.messageId }).where(eq(jobs.id, jobId));
  }

  return c.json(
    {
      job_id: jobId,
      status: 'queued',
      mode: enq.mode,
      poll_url: `/v1/jobs/${jobId}`,
    },
    202,
  );
});
