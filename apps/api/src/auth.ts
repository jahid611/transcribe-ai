import { createClerkClient, verifyToken } from '@clerk/backend';
import { createMiddleware } from 'hono/factory';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { users, type User } from '@transcribe-ai/db/schema';
import { getDb } from './db';
import type { Env } from './env';

export interface AuthContext {
  user: User;
  clerkUserId: string;
}

export const authMiddleware = createMiddleware<{
  Bindings: Env;
  Variables: { auth: AuthContext };
}>(async (c, next) => {
  if (c.env.STUB === 'true') {
    const db = getDb(c.env);
    const stubClerkId = 'stub_user_1';
    let [user] = await db.select().from(users).where(eq(users.clerkId, stubClerkId)).limit(1);
    if (!user) {
      const id = nanoid();
      await db.insert(users).values({
        id,
        clerkId: stubClerkId,
        email: 'demo@transcribe-ai.local',
        name: 'Demo User',
        tier: 'free',
      });
      [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    }
    c.set('auth', { user: user!, clerkUserId: stubClerkId });
    return next();
  }

  const authHeader = c.req.header('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return c.json({ error: { code: 'unauthorized', message: 'Missing token' } }, 401);

  let payload: { sub: string; email?: string };
  try {
    payload = (await verifyToken(token, {
      secretKey: c.env.CLERK_SECRET_KEY,
    })) as { sub: string; email?: string };
  } catch {
    return c.json({ error: { code: 'unauthorized', message: 'Invalid token' } }, 401);
  }

  const db = getDb(c.env);
  let [user] = await db.select().from(users).where(eq(users.clerkId, payload.sub)).limit(1);

  if (!user) {
    const clerk = createClerkClient({ secretKey: c.env.CLERK_SECRET_KEY });
    const clerkUser = await clerk.users.getUser(payload.sub);
    const id = nanoid();
    await db.insert(users).values({
      id,
      clerkId: payload.sub,
      email: clerkUser.primaryEmailAddress?.emailAddress ?? payload.email ?? 'unknown@unknown',
      name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || null,
      tier: 'free',
    });
    [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  }

  c.set('auth', { user: user!, clerkUserId: payload.sub });
  return next();
});
