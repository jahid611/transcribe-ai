import { Client, Receiver } from '@upstash/qstash';
import { isStub, type Env } from '../env';
import { processTranscribeJob } from './pipeline';

export interface EnqueueResult {
  messageId: string | null;
  mode: 'qstash' | 'inline';
}

/**
 * Enqueue un job de transcription.
 *
 * - Réel (QSTASH_TOKEN présent) : publie dans QStash, qui rappellera
 *   POST {API_URL}/v1/queue/transcribe avec une signature.
 * - STUB / pas de token : traite le job inline via executionCtx.waitUntil
 *   (QStash ne peut pas atteindre un localhost). Le client poll quand même
 *   le statut, l'UX reste identique.
 */
export async function enqueueTranscribeJob(
  env: Env,
  ctx: ExecutionContext | undefined,
  jobId: string,
  tier: 'free' | 'pro' | 'enterprise',
): Promise<EnqueueResult> {
  const canUseQstash = !isStub(env) && !!env.QSTASH_TOKEN && !!env.API_URL;

  if (!canUseQstash) {
    if (ctx) ctx.waitUntil(processTranscribeJob(env, jobId));
    else void processTranscribeJob(env, jobId);
    return { messageId: null, mode: 'inline' };
  }

  const qstash = new Client({ token: env.QSTASH_TOKEN! });
  // Queues séparées par tier pour la priorisation (cf. QUEUE.md §6).
  const url = `${env.API_URL}/v1/queue/transcribe`;
  const res = await qstash.publishJSON({
    url,
    body: { jobId },
    retries: 3,
    deduplicationId: jobId,
    headers: { 'x-tier': tier },
  });
  return { messageId: res.messageId, mode: 'qstash' };
}

/** Vérifie la signature d'un webhook QStash entrant. */
export async function verifyQstashSignature(
  env: Env,
  signature: string,
  body: string,
): Promise<boolean> {
  if (isStub(env) || !env.QSTASH_CURRENT_SIGNING_KEY) {
    // En stub on n'utilise pas QStash ; le receiver n'est pas censé être appelé.
    return true;
  }
  const receiver = new Receiver({
    currentSigningKey: env.QSTASH_CURRENT_SIGNING_KEY,
    nextSigningKey: env.QSTASH_NEXT_SIGNING_KEY ?? env.QSTASH_CURRENT_SIGNING_KEY,
  });
  try {
    return await receiver.verify({ signature, body });
  } catch {
    return false;
  }
}
