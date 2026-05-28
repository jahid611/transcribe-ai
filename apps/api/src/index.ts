import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { summariesRoute } from './routes/summaries';
import { meRoute } from './routes/me';
import { stripeRoute } from './routes/stripe';
import type { Env } from './env';

const app = new Hono<{ Bindings: Env }>();

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

app.notFound((c) => c.json({ error: { code: 'not_found' } }, 404));
app.onError((err, c) => {
  console.error('API error', err);
  return c.json(
    { error: { code: 'internal', message: err.message } },
    500,
  );
});

export default app;
