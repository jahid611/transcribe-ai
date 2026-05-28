import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { users } from '@transcribe-ai/db/schema';
import { getDb } from '../db';
import { authMiddleware, type AuthContext } from '../auth';
import type { Env } from '../env';

export const stripeRoute = new Hono<{
  Bindings: Env;
  Variables: { auth: AuthContext };
}>();

stripeRoute.post('/checkout', authMiddleware, async (c) => {
  const { user } = c.get('auth');
  if (c.env.STUB === 'true' || !c.env.STRIPE_SECRET_KEY) {
    const db = getDb(c.env);
    await db.update(users).set({ tier: 'pro' }).where(eq(users.id, user.id));
    return c.json({ url: `${c.env.APP_URL}/app?upgraded=stub` });
  }

  if (!c.env.STRIPE_PRICE_PRO_MONTHLY) {
    return c.json({ error: { code: 'config_missing', message: 'STRIPE_PRICE_PRO_MONTHLY not set' } }, 500);
  }

  const params = new URLSearchParams();
  params.set('mode', 'subscription');
  params.set('success_url', `${c.env.APP_URL}/app?upgraded=true`);
  params.set('cancel_url', `${c.env.APP_URL}/pricing?cancelled=true`);
  params.set('client_reference_id', user.id);
  params.set('customer_email', user.email);
  params.set('line_items[0][price]', c.env.STRIPE_PRICE_PRO_MONTHLY);
  params.set('line_items[0][quantity]', '1');

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${c.env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    return c.json({ error: { code: 'stripe_failed', message: text } }, 502);
  }
  const data = (await res.json()) as { url?: string };
  return c.json({ url: data.url });
});

stripeRoute.post('/webhook', async (c) => {
  if (!c.env.STRIPE_WEBHOOK_SECRET || !c.env.STRIPE_SECRET_KEY) {
    return c.json({ received: true, stub: true });
  }

  const signature = c.req.header('stripe-signature');
  const body = await c.req.text();

  const verified = await verifyStripeSignature(
    body,
    signature ?? '',
    c.env.STRIPE_WEBHOOK_SECRET,
  );
  if (!verified) return c.json({ error: { code: 'invalid_signature' } }, 400);

  const event = JSON.parse(body) as {
    type: string;
    data: { object: { client_reference_id?: string; customer?: string; subscription?: string } };
  };

  const db = getDb(c.env);

  switch (event.type) {
    case 'checkout.session.completed': {
      const obj = event.data.object;
      if (obj.client_reference_id) {
        await db
          .update(users)
          .set({
            tier: 'pro',
            stripeCustomerId: obj.customer ?? null,
            stripeSubscriptionId: obj.subscription ?? null,
          })
          .where(eq(users.id, obj.client_reference_id));
      }
      break;
    }
    case 'customer.subscription.deleted': {
      const obj = event.data.object;
      if (obj.customer) {
        const [u] = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.stripeCustomerId, obj.customer))
          .limit(1);
        if (u) await db.update(users).set({ tier: 'free' }).where(eq(users.id, u.id));
      }
      break;
    }
  }

  return c.json({ received: true });
});

async function verifyStripeSignature(
  payload: string,
  header: string,
  secret: string,
): Promise<boolean> {
  const parts = Object.fromEntries(
    header.split(',').map((p) => p.split('=') as [string, string]),
  );
  const timestamp = parts.t;
  const v1 = parts.v1;
  if (!timestamp || !v1) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(signedPayload),
  );
  const expected = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return expected === v1;
}
