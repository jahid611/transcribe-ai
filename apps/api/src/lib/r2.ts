import type { Env } from '../env';

/**
 * Stockage audio via Cloudflare R2.
 *
 * En mode STUB / dev sans binding R2, on retombe sur un stockage mémoire
 * éphémère (suffisant pour traiter un job inline dans la même instance Worker).
 */

const memoryStore = new Map<string, ArrayBuffer>();

export function buildAudioKey(userId: string, jobId: string, fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? 'bin';
  return `users/${userId}/audio/${jobId}.${ext}`;
}

export async function putAudio(
  env: Env,
  key: string,
  data: ArrayBuffer,
  contentType: string,
): Promise<void> {
  if (env.AUDIO_BUCKET) {
    await env.AUDIO_BUCKET.put(key, data, {
      httpMetadata: { contentType },
    });
    return;
  }
  memoryStore.set(key, data);
}

export async function getAudio(env: Env, key: string): Promise<ArrayBuffer | null> {
  if (env.AUDIO_BUCKET) {
    const obj = await env.AUDIO_BUCKET.get(key);
    if (!obj) return null;
    return obj.arrayBuffer();
  }
  return memoryStore.get(key) ?? null;
}

export async function deleteAudio(env: Env, key: string): Promise<void> {
  if (env.AUDIO_BUCKET) {
    await env.AUDIO_BUCKET.delete(key);
    return;
  }
  memoryStore.delete(key);
}
