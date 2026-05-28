export class QuotaExceededError extends Error {
  constructor(
    public readonly quota: string,
    public readonly limit: number | string,
  ) {
    super(`Quota exceeded: ${quota} (limit: ${limit})`);
    this.name = 'QuotaExceededError';
  }
}

export class LLMProviderError extends Error {
  constructor(
    public readonly providerId: string,
    public readonly status: number,
    message: string,
  ) {
    super(`[${providerId}] ${status}: ${message}`);
    this.name = 'LLMProviderError';
  }
}
