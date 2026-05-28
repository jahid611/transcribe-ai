import { serve } from '@hono/node-server';
import app from './index';

const port = Number(process.env.PORT ?? 8787);

serve({ fetch: app.fetch, port }, (info) => {
  const stub = process.env.STUB === 'true';
  console.log(`🎧 transcribe-ai API (node) on http://localhost:${info.port}${stub ? ' [STUB]' : ''}`);
});
