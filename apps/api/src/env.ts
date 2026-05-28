export interface Env {
  STUB?: string;
  APP_URL: string;
  API_URL?: string;

  // R2 bucket (binding défini dans wrangler.toml). Optionnel en mode STUB/local.
  AUDIO_BUCKET?: R2Bucket;

  CLERK_SECRET_KEY: string;
  CLERK_PUBLISHABLE_KEY: string;

  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN?: string;

  GROQ_API_KEY?: string;
  GROQ_MODEL?: string;
  OPENROUTER_API_KEY?: string;
  OPENROUTER_MODEL?: string;
  TOGETHER_API_KEY?: string;
  TOGETHER_MODEL?: string;

  LLM_PRIMARY?: string;
  LLM_FALLBACK?: string;
  LLM_EMERGENCY?: string;

  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PRICE_PRO_MONTHLY?: string;

  QSTASH_TOKEN?: string;
  QSTASH_CURRENT_SIGNING_KEY?: string;
  QSTASH_NEXT_SIGNING_KEY?: string;
}

export function isStub(env: Env): boolean {
  return env.STUB === 'true';
}
