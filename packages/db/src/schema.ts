import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    clerkId: text('clerk_id').notNull().unique(),
    email: text('email').notNull(),
    name: text('name'),
    tier: text('tier', { enum: ['free', 'pro', 'enterprise'] })
      .notNull()
      .default('free'),
    stripeCustomerId: text('stripe_customer_id'),
    stripeSubscriptionId: text('stripe_subscription_id'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    deletedAt: integer('deleted_at', { mode: 'timestamp' }),
  },
  (t) => ({
    clerkIdx: index('users_clerk_idx').on(t.clerkId),
    stripeIdx: index('users_stripe_idx').on(t.stripeCustomerId),
  }),
);

export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title'),
    language: text('language').notNull().default('fr'),
    transcript: text('transcript').notNull(),
    durationSec: integer('duration_sec').notNull().default(0),
    audioKey: text('audio_key'),
    source: text('source', { enum: ['live', 'upload'] })
      .notNull()
      .default('live'),
    summaryId: text('summary_id'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => ({
    userIdx: index('sessions_user_idx').on(t.userId, t.createdAt),
  }),
);

export const summaries = sqliteTable(
  'summaries',
  {
    id: text('id').primaryKey(),
    sessionId: text('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    language: text('language').notNull().default('fr'),
    model: text('model').notNull(),
    provider: text('provider').notNull(),
    payload: text('payload', { mode: 'json' }).notNull(),
    inputTokens: integer('input_tokens').notNull().default(0),
    outputTokens: integer('output_tokens').notNull().default(0),
    costUsd: real('cost_usd').notNull().default(0),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => ({
    userIdx: index('summaries_user_idx').on(t.userId, t.createdAt),
    sessionIdx: index('summaries_session_idx').on(t.sessionId),
  }),
);

export const usageEvents = sqliteTable(
  'usage_events',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),
    costUsd: real('cost_usd').notNull().default(0),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => ({
    userKindIdx: index('usage_user_kind_idx').on(t.userId, t.kind, t.createdAt),
  }),
);

export const jobs = sqliteTable(
  'jobs',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tier: text('tier', { enum: ['free', 'pro', 'enterprise'] })
      .notNull()
      .default('free'),
    type: text('type').notNull().default('transcribe'),
    status: text('status', {
      enum: ['queued', 'running', 'completed', 'failed', 'cancelled'],
    })
      .notNull()
      .default('queued'),
    progress: integer('progress').notNull().default(0),
    statusLabel: text('status_label'),
    r2Key: text('r2_key'),
    fileName: text('file_name'),
    fileSizeBytes: integer('file_size_bytes').notNull().default(0),
    language: text('language').notNull().default('fr'),
    durationSec: real('duration_sec').notNull().default(0),
    transcriptionId: text('transcription_id'),
    sessionId: text('session_id'),
    summaryId: text('summary_id'),
    qstashMessageId: text('qstash_message_id'),
    error: text('error'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    startedAt: integer('started_at', { mode: 'timestamp' }),
    finishedAt: integer('finished_at', { mode: 'timestamp' }),
  },
  (t) => ({
    userIdx: index('jobs_user_idx').on(t.userId, t.createdAt),
    statusIdx: index('jobs_status_idx').on(t.status),
  }),
);

export const transcriptions = sqliteTable(
  'transcriptions',
  {
    id: text('id').primaryKey(),
    jobId: text('job_id')
      .notNull()
      .references(() => jobs.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    language: text('language').notNull().default('fr'),
    engine: text('engine').notNull(),
    model: text('model').notNull(),
    text: text('text').notNull(),
    segments: text('segments', { mode: 'json' }),
    durationSec: real('duration_sec').notNull().default(0),
    costUsd: real('cost_usd').notNull().default(0),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => ({
    jobIdx: index('transcriptions_job_idx').on(t.jobId),
    userIdx: index('transcriptions_user_idx').on(t.userId, t.createdAt),
  }),
);

export const usageLogs = sqliteTable(
  'usage_logs',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    jobId: text('job_id'),
    kind: text('kind').notNull(),
    whisperMinutes: real('whisper_minutes').notNull().default(0),
    whisperCostUsd: real('whisper_cost_usd').notNull().default(0),
    llmInputTokens: integer('llm_input_tokens').notNull().default(0),
    llmOutputTokens: integer('llm_output_tokens').notNull().default(0),
    llmCostUsd: real('llm_cost_usd').notNull().default(0),
    totalCostUsd: real('total_cost_usd').notNull().default(0),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => ({
    userIdx: index('usage_logs_user_idx').on(t.userId, t.createdAt),
  }),
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type Summary = typeof summaries.$inferSelect;
export type NewSummary = typeof summaries.$inferInsert;
export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;
export type Transcription = typeof transcriptions.$inferSelect;
export type NewTranscription = typeof transcriptions.$inferInsert;
export type UsageLog = typeof usageLogs.$inferSelect;
export type NewUsageLog = typeof usageLogs.$inferInsert;
