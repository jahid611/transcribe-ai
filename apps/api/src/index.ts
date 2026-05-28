import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { summariesRoute } from './routes/summaries';
import { meRoute } from './routes/me';
import { stripeRoute } from './routes/stripe';
import { transcribeRoute } from './routes/transcribe';
import { jobsRoute } from './routes/jobs';
import { queueRoute } from './routes/queue';
import type { Env } from './env';

const app = new Hono<{ Bindings: Env }>();

// Sous Node (dev local), c.env ne contient pas les vars : on complète depuis
// process.env. Sous Workers, les bindings sont déjà dans c.env (on ne remplit
// que les clés absentes, sans écraser AUDIO_BUCKET & co).
app.use('*', async (c, next) => {
  const penv = typeof process !== 'undefined' ? process.env : undefined;
  if (penv) {
    const target = c.env as unknown as Record<string, unknown>;
    for (const key of Object.keys(penv)) {
      if (target[key] === undefined) target[key] = penv[key];
    }
  }
  return next();
});

app.use('*', logger());
app.use(
  '*',
  cors({
    origin: (origin, c) => {
      const allowed = c.env.APP_URL ?? 'http://localhost:3000';
      if (!origin) return allowed;
      return origin === allowed ? origin : allowed;
    },
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'stripe-signature'],
    credentials: true,
  }),
);

app.get('/health', (c) =>
  c.json({
    status: 'ok',
    stub: c.env.STUB === 'true',
    ts: new Date().toISOString(),
  }),
);

app.route('/v1/me', meRoute);
app.route('/v1/summaries', summariesRoute);
app.route('/v1/stripe', stripeRoute);
app.route('/v1/transcribe', transcribeRoute);
app.route('/v1/jobs', jobsRoute);
app.route('/v1/queue', queueRoute);

app.notFound((c) => c.json({ error: { code: 'not_found' } }, 404));
app.onError((err, c) => {
  console.error('API error', err);
  return c.json(
    { error: { code: 'internal', message: err.message } },
    500,
  );
});

export default app;
