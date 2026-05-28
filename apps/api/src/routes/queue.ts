import { Hono } from 'hono';
import { verifyQstashSignature } from '../lib/queue';
import { processTranscribeJob } from '../lib/pipeline';
import type { Env } from '../env';

/**
 * Receiver appelé par QStash (webhook signé).
 * Pas de auth Clerk ici : l'authenticité vient de la signature QStash.
 */
export const queueRoute = new Hono<{ Bindings: Env }>();

queueRoute.post('/transcribe', async (c) => {
  const body = await c.req.text();
  const signature =
    c.req.header('upstash-signature') ?? c.req.header('Upstash-Signature') ?? '';

  const valid = await verifyQstashSignature(c.env, signature, body);
  if (!valid) {
    return c.json({ error: { code: 'invalid_signature' } }, 401);
  }

  let payload: { jobId?: string };
  try {
    payload = JSON.parse(body);
  } catch {
    return c.json({ error: { code: 'invalid_body' } }, 400);
  }
  if (!payload.jobId) {
    return c.json({ error: { code: 'missing_job_id' } }, 400);
  }

  // Traitement potentiellement long : on laisse le Worker le mener à terme.
  await processTranscribeJob(c.env, payload.jobId);
  return c.json({ ok: true });
});
