import type { Tier } from './tiers';
import { getLimits } from './tiers';

export const ACCEPTED_AUDIO_MIME = [
  'audio/mpeg', // mp3
  'audio/mp3',
  'audio/mp4', // m4a / mp4 audio
  'audio/x-m4a',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/webm',
  'video/mp4', // mp4 container
  'video/webm',
] as const;

export const ACCEPTED_AUDIO_EXT = ['mp3', 'mp4', 'wav', 'm4a', 'webm'] as const;

export const MB = 1024 * 1024;

export function maxUploadBytes(tier: Tier): number {
  return getLimits(tier).maxFileSizeMB * MB;
}

export function isAcceptedAudio(fileName: string, mime: string): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  const extOk = (ACCEPTED_AUDIO_EXT as readonly string[]).includes(ext);
  const mimeOk =
    mime === '' || (ACCEPTED_AUDIO_MIME as readonly string[]).includes(mime);
  return extOk && mimeOk;
}

// Groq Whisper large-v3 : $0.111 / heure audio.
export const WHISPER_USD_PER_MINUTE = 0.111 / 60;

export function estimateWhisperCost(durationSec: number): number {
  return (durationSec / 60) * WHISPER_USD_PER_MINUTE;
}
