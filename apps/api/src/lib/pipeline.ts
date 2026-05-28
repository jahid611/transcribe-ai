import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import {
  buildRouterFromEnv,
  getSummarySystemPrompt,
  wrapTranscript,
} from '@transcribe-ai/llm-router';
import { SummarySchema } from '@transcribe-ai/shared';
import {
  jobs,
  sessions,
  summaries,
  transcriptions,
  usageLogs,
} from '@transcribe-ai/db/schema';
import { getDb } from '../db';
import { getAudio } from './r2';
import { transcribeAudio } from './transcription';
import type { Env } from '../env';

async function patchJob(
  env: Env,
  jobId: string,
  patch: Partial<{
    status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
    progress: number;
    statusLabel: string;
    transcriptionId: string;
    sessionId: string;
    summaryId: string;
    durationSec: number;
    error: string;
    startedAt: Date;
    finishedAt: Date;
  }>,
): Promise<void> {
  const db = getDb(env);
  await db.update(jobs).set(patch).where(eq(jobs.id, jobId));
}

/**
 * Pipeline complet d'un job de transcription :
 * R2 → Whisper → transcription (Turso) → LLMRouter → session + summary → usage_logs.
 * Idempotent côté statut : ne reprend pas un job déjà terminé/annulé.
 */
export async function processTranscribeJob(env: Env, jobId: string): Promise<void> {
  const db = getDb(env);

  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
  if (!job) return;
  if (job.status === 'cancelled' || job.status === 'completed') return;

  try {
    await patchJob(env, jobId, {
      status: 'running',
      progress: 10,
      statusLabel: 'Transcription en cours…',
      startedAt: new Date(),
    });

    const language = (job.language === 'en' ? 'en' : 'fr') as 'fr' | 'en';

    // 1. Récupère l'audio depuis R2 (ou mémoire en stub).
    const audio = job.r2Key ? await getAudio(env, job.r2Key) : null;
    if (!audio) {
      throw new Error('Audio introuvable dans le stockage');
    }

    // 2. Transcription Whisper.
    const tr = await transcribeAudio(env, audio, {
      fileName: job.fileName ?? 'audio.wav',
      language,
    });

    // Re-check annulation après l'étape longue.
    const [mid] = await db.select({ status: jobs.status }).from(jobs).where(eq(jobs.id, jobId)).limit(1);
    if (mid?.status === 'cancelled') return;

    const transcriptionId = nanoid();
    await db.insert(transcriptions).values({
      id: transcriptionId,
      jobId,
      userId: job.userId,
      language: tr.language,
      engine: tr.engine,
      model: tr.model,
      text: tr.text,
      segments: tr.segments,
      durationSec: tr.durationSec,
      costUsd: tr.costUsd,
    });

    await patchJob(env, jobId, {
      progress: 60,
      statusLabel: 'Résumé en cours…',
      transcriptionId,
      durationSec: tr.durationSec,
    });

    // 3. Résumé via LLMRouter (providers existants : Groq → OpenRouter → Together).
    const router = buildRouterFromEnv(env);
    const llm = await router.summarize(
      [
        { role: 'system', content: getSummarySystemPrompt(language) },
        { role: 'user', content: wrapTranscript(tr.text) },
      ],
      { jsonMode: true, temperature: 0.3, maxTokens: 1500 },
    );

    const parsed = SummarySchema.safeParse(llm.json ?? safeJson(llm.text));
    if (!parsed.success) {
      throw new Error('Résumé LLM invalide: ' + JSON.stringify(parsed.error.flatten()));
    }

    // 4. Persistance session (source=upload) + summary, comme le chemin live.
    const sessionId = nanoid();
    const summaryId = nanoid();
    const now = new Date();

    await db.insert(sessions).values({
      id: sessionId,
      userId: job.userId,
      title: parsed.data.title,
      language,
      transcript: tr.text,
      durationSec: Math.round(tr.durationSec),
      audioKey: job.r2Key ?? null,
      source: 'upload',
      summaryId,
      createdAt: now,
    });

    await db.insert(summaries).values({
      id: summaryId,
      sessionId,
      userId: job.userId,
      language,
      model: llm.model,
      provider: llm.provider,
      payload: parsed.data,
      inputTokens: llm.usage.inputTokens,
      outputTokens: llm.usage.outputTokens,
      costUsd: llm.costUsd,
      createdAt: now,
    });

    // 5. Coût réel du job (Whisper minutes + LLM tokens).
    const totalCost = tr.costUsd + llm.costUsd;
    await db.insert(usageLogs).values({
      id: nanoid(),
      userId: job.userId,
      jobId,
      kind: 'transcribe+summarize',
      whisperMinutes: tr.durationSec / 60,
      whisperCostUsd: tr.costUsd,
      llmInputTokens: llm.usage.inputTokens,
      llmOutputTokens: llm.usage.outputTokens,
      llmCostUsd: llm.costUsd,
      totalCostUsd: totalCost,
      createdAt: now,
    });

    await patchJob(env, jobId, {
      status: 'completed',
      progress: 100,
      statusLabel: 'Terminé',
      sessionId,
      summaryId,
      finishedAt: new Date(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    await patchJob(env, jobId, {
      status: 'failed',
      statusLabel: 'Échec',
      error: message.slice(0, 1000),
      finishedAt: new Date(),
    });
  }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
