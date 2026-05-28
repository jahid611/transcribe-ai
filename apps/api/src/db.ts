import { createClient } from '@libsql/client';
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';
import * as schema from '@transcribe-ai/db/schema';
import type { Env } from './env';

let cached: LibSQLDatabase<typeof schema> | null = null;

export function getDb(env: Env): LibSQLDatabase<typeof schema> {
  if (cached) return cached;
  const client = createClient({
    url: env.TURSO_DATABASE_URL,
    authToken: env.TURSO_AUTH_TOKEN,
  });
  cached = drizzle(client, { schema });
  return cached;
}
