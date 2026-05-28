export type BreakerState = 'closed' | 'open' | 'half-open';

export interface BreakerConfig {
  threshold: number;
  windowMs: number;
  cooldownMs: number;
}

export class CircuitBreaker {
  private state: BreakerState = 'closed';
  private failures: number[] = [];
  private nextAttemptAt = 0;

  constructor(private readonly cfg: BreakerConfig) {}

  canRequest(): boolean {
    if (this.state === 'closed') return true;
    if (this.state === 'open' && Date.now() >= this.nextAttemptAt) {
      this.state = 'half-open';
      return true;
    }
    return this.state === 'half-open';
  }

  recordSuccess(): void {
    this.failures = [];
    this.state = 'closed';
  }

  recordFailure(): void {
    const now = Date.now();
    this.failures = this.failures.filter((t) => now - t < this.cfg.windowMs);
    this.failures.push(now);
    if (this.failures.length >= this.cfg.threshold) {
      this.state = 'open';
      this.nextAttemptAt = now + this.cfg.cooldownMs;
    }
  }

  getState(): BreakerState {
    return this.state;
  }
}
