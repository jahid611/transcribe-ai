import { LLMProviderError } from '@transcribe-ai/shared';
import type { LLMMessage, LLMProvider, SummarizeOptions, SummarizeResult } from '../types';

export class OpenRouterProvider implements LLMProvider {
  readonly id = 'openrouter';
  readonly displayName = 'OpenRouter';

  constructor(
    private readonly apiKey: string,
    private readonly defaultModel = 'meta-llama/llama-3.3-70b-instruct',
    private readonly referer = 'https://transcribe-ai.app',
  ) {}

  async summarize(
    messages: LLMMessage[],
    options: SummarizeOptions = {},
  ): Promise<SummarizeResult> {
    const model = options.model ?? this.defaultModel;
    const start = Date.now();

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'HTTP-Referer': this.referer,
        'X-Title': 'transcribe-ai',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature ?? 0.3,
        max_tokens: options.maxTokens ?? 2000,
        response_format: options.jsonMode ? { type: 'json_object' } : undefined,
      }),
      signal: options.signal,
    });

    if (!res.ok) {
      const body = await res.text();
      throw new LLMProviderError(this.id, res.status, body);
    }

    const data = (await res.json()) as {
      choices: { message: { content: string } }[];
      usage?: { prompt_tokens: number; completion_tokens: number };
    };

    const text = data.choices[0]!.message.content;
    const inputTokens = data.usage?.prompt_tokens ?? estimateTokens(messages);
    const outputTokens = data.usage?.completion_tokens ?? estimateTokens([{ role: 'assistant', content: text }]);

    return {
      text,
      json: options.jsonMode ? safeJson(text) : undefined,
      usage: { inputTokens, outputTokens },
      model,
      provider: this.id,
      costUsd: this.estimateCost(inputTokens, outputTokens),
      latencyMs: Date.now() - start,
    };
  }

  estimateCost(input: number, output: number): number {
    return (input / 1_000_000) * 1.0 + (output / 1_000_000) * 3.0;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/models', {
        headers: { Authorization: `Bearer ${this.apiKey}` },
        signal: AbortSignal.timeout(3000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function estimateTokens(messages: LLMMessage[]): number {
  return Math.ceil(messages.reduce((s, m) => s + m.content.length, 0) / 4);
}
