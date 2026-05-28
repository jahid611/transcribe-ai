import type { LLMMessage, LLMProvider, SummarizeOptions, SummarizeResult } from './types';
import { CircuitBreaker } from './circuit-breaker';

export interface RouterConfig {
  primary: LLMProvider;
  fallbacks: LLMProvider[];
  maxAttempts?: number;
  onProviderUsed?: (event: {
    provider: string;
    model: string;
    costUsd: number;
    latencyMs: number;
    inputTokens: number;
    outputTokens: number;
  }) => void;
  onProviderFailed?: (event: { provider: string; error: Error }) => void;
}

export class LLMRouter {
  private readonly providers: LLMProvider[];
  private readonly breakers = new Map<string, CircuitBreaker>();

  constructor(private readonly cfg: RouterConfig) {
    this.providers = [cfg.primary, ...cfg.fallbacks];
    for (const p of this.providers) {
      this.breakers.set(
        p.id,
        new CircuitBreaker({ threshold: 5, windowMs: 60_000, cooldownMs: 30_000 }),
      );
    }
  }

  async summarize(
    messages: LLMMessage[],
    options?: SummarizeOptions,
  ): Promise<SummarizeResult> {
    const errors: Error[] = [];
    const maxAttempts = this.cfg.maxAttempts ?? this.providers.length;

    for (let i = 0; i < Math.min(maxAttempts, this.providers.length); i++) {
      const provider = this.providers[i]!;
      const breaker = this.breakers.get(provider.id)!;

      if (!breaker.canRequest()) {
        errors.push(new Error(`[${provider.id}] circuit open`));
        continue;
      }

      try {
        const result = await provider.summarize(messages, options);
        breaker.recordSuccess();
        this.cfg.onProviderUsed?.({
          provider: result.provider,
          model: result.model,
          costUsd: result.costUsd,
          latencyMs: result.latencyMs,
          inputTokens: result.usage.inputTokens,
          outputTokens: result.usage.outputTokens,
        });
        return result;
      } catch (err) {
        breaker.recordFailure();
        const error = err instanceof Error ? err : new Error(String(err));
        errors.push(error);
        this.cfg.onProviderFailed?.({ provider: provider.id, error });
      }
    }

    throw new AggregateError(errors, 'All LLM providers failed');
  }

  getBreakerState(providerId: string) {
    return this.breakers.get(providerId)?.getState() ?? 'closed';
  }
}
