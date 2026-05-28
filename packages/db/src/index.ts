import { createClient, type Client } from '@libsql/client';
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';
import * as schema from './schema';

export * from './schema';
export { eq, and, or, desc, asc, sql, inArray, gte, lte } from 'drizzle-orm';

export type DB = LibSQLDatabase<typeof schema>;

export interface DbConfig {
  url: string;
  authToken?: string;
}

let cached: { db: DB; client: Client } | null = null;

export function createDb(config: DbConfig): DB {
  if (cached) return cached.db;
  const client = createClient({
    url: config.url,
    authToken: config.authToken,
  });
  const db = drizzle(client, { schema });
  cached = { db, client };
  return db;
}

export function getDb(): DB {
  if (!cached) {
    const url = process.env.TURSO_DATABASE_URL ?? 'file:./local.db';
    const authToken = process.env.TURSO_AUTH_TOKEN;
    return createDb({ url, authToken });
  }
  return cached.db;
}
