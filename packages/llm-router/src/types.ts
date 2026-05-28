export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface SummarizeOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  jsonMode?: boolean;
  signal?: AbortSignal;
}

export interface SummarizeResult {
  text: string;
  json?: unknown;
  usage: { inputTokens: number; outputTokens: number };
  model: string;
  provider: string;
  costUsd: number;
  latencyMs: number;
}

export interface LLMProvider {
  readonly id: string;
  readonly displayName: string;
  summarize(messages: LLMMessage[], options?: SummarizeOptions): Promise<SummarizeResult>;
  estimateCost(inputTokens: number, outputTokens: number): number;
  healthCheck(): Promise<boolean>;
}
