import { estimateWhisperCost } from '@transcribe-ai/shared';
import { isStub, type Env } from '../env';

export interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
}

export interface TranscriptionResult {
  text: string;
  language: string;
  durationSec: number;
  segments: TranscriptionSegment[];
  engine: string;
  model: string;
  costUsd: number;
}

const GROQ_WHISPER_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
const WHISPER_MODEL = 'whisper-large-v3';

/**
 * Transcrit un buffer audio.
 * - Réel : Groq Whisper large-v3 (verbose_json).
 * - STUB / pas de clé : transcript canned déterministe (démo sans clé).
 */
export async function transcribeAudio(
  env: Env,
  audio: ArrayBuffer,
  opts: { fileName: string; language?: 'fr' | 'en'; contentType?: string },
): Promise<TranscriptionResult> {
  if (isStub(env) || !env.GROQ_API_KEY) {
    return stubTranscription(opts.language ?? 'fr');
  }

  const form = new FormData();
  const blob = new Blob([audio], { type: opts.contentType ?? 'application/octet-stream' });
  form.append('file', blob, opts.fileName || 'audio.wav');
  form.append('model', WHISPER_MODEL);
  form.append('response_format', 'verbose_json');
  if (opts.language) form.append('language', opts.language);

  const res = await fetch(GROQ_WHISPER_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.GROQ_API_KEY}` },
    body: form,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new TranscriptionError(res.status, `Groq Whisper ${res.status}: ${body}`);
  }

  const data = (await res.json()) as {
    text: string;
    language?: string;
    duration?: number;
    segments?: { start: number; end: number; text: string }[];
  };

  const durationSec = data.duration ?? 0;
  const segments: TranscriptionSegment[] = (data.segments ?? []).map((s) => ({
    start: s.start,
    end: s.end,
    text: s.text,
  }));

  return {
    text: data.text,
    language: data.language ?? opts.language ?? 'fr',
    durationSec,
    segments,
    engine: 'whisper-groq',
    model: WHISPER_MODEL,
    costUsd: estimateWhisperCost(durationSec),
  };
}

function stubTranscription(language: 'fr' | 'en'): TranscriptionResult {
  const text =
    language === 'en'
      ? 'This is a stub transcription generated without any API key. The meeting covered three topics: roadmap, budget, and hiring. Alice will finalize the specs by next week.'
      : "Ceci est une transcription factice générée sans clé API. La réunion a couvert trois sujets : la roadmap, le budget et les recrutements. Alice finalisera les specs la semaine prochaine.";
  const durationSec = 42;
  return {
    text,
    language,
    durationSec,
    segments: [
      { start: 0, end: 12, text: text.slice(0, 60) },
      { start: 12, end: durationSec, text: text.slice(60) },
    ],
    engine: 'stub-whisper',
    model: 'stub-1.0',
    costUsd: 0,
  };
}

export class TranscriptionError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'TranscriptionError';
  }
}
