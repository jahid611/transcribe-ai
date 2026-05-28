import type { Config } from 'drizzle-kit';

const url = process.env.TURSO_DATABASE_URL ?? 'file:./local.db';
const authToken = process.env.TURSO_AUTH_TOKEN;

export default {
  schema: './src/schema.ts',
  out: './migrations',
  dialect: 'turso',
  dbCredentials: {
    url,
    authToken,
  },
} satisfies Config;
