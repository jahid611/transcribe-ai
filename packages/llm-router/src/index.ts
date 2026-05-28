export * from './types';
export * from './circuit-breaker';
export * from './router';
export * from './prompts';
export { GroqProvider } from './providers/groq';
export { OpenRouterProvider } from './providers/openrouter';
export { TogetherProvider } from './providers/together';
export { StubProvider } from './providers/stub';

import { GroqProvider } from './providers/groq';
import { OpenRouterProvider } from './providers/openrouter';
import { TogetherProvider } from './providers/together';
import { StubProvider } from './providers/stub';
import { LLMRouter } from './router';
import type { LLMProvider } from './types';

export interface RouterEnv {
  STUB?: string | boolean;
  GROQ_API_KEY?: string;
  GROQ_MODEL?: string;
  OPENROUTER_API_KEY?: string;
  OPENROUTER_MODEL?: string;
  TOGETHER_API_KEY?: string;
  TOGETHER_MODEL?: string;
  LLM_PRIMARY?: string;
  LLM_FALLBACK?: string;
  LLM_EMERGENCY?: string;
}

function isStubMode(env: RouterEnv): boolean {
  return env.STUB === true || env.STUB === 'true' || env.STUB === '1';
}

function buildProvider(
  id: string | undefined,
  env: RouterEnv,
): LLMProvider | null {
  if (!id) return null;
  switch (id) {
    case 'groq':
      return env.GROQ_API_KEY ? new GroqProvider(env.GROQ_API_KEY, env.GROQ_MODEL) : null;
    case 'openrouter':
      return env.OPENROUTER_API_KEY
        ? new OpenRouterProvider(env.OPENROUTER_API_KEY, env.OPENROUTER_MODEL)
        : null;
    case 'together':
      return env.TOGETHER_API_KEY
        ? new TogetherProvider(env.TOGETHER_API_KEY, env.TOGETHER_MODEL)
        : null;
    case 'stub':
      return new StubProvider();
    default:
      return null;
  }
}

export function buildRouterFromEnv(env: RouterEnv): LLMRouter {
  if (isStubMode(env)) {
    return new LLMRouter({ primary: new StubProvider(), fallbacks: [] });
  }

  const primary =
    buildProvider(env.LLM_PRIMARY ?? 'groq', env) ?? new StubProvider();
  const fallbacks = [
    buildProvider(env.LLM_FALLBACK ?? 'openrouter', env),
    buildProvider(env.LLM_EMERGENCY ?? 'together', env),
  ].filter((p): p is LLMProvider => p !== null);

  return new LLMRouter({ primary, fallbacks });
}
