import { LLMProviderError } from '@transcribe-ai/shared';
import type { LLMMessage, LLMProvider, SummarizeOptions, SummarizeResult } from '../types';

export class TogetherProvider implements LLMProvider {
  readonly id = 'together';
  readonly displayName = 'Together AI';

  constructor(
    private readonly apiKey: string,
    private readonly defaultModel = 'mistralai/Mixtral-8x22B-Instruct-v0.1',
  ) {}

  async summarize(
    messages: LLMMessage[],
    options: SummarizeOptions = {},
  ): Promise<SummarizeResult> {
    const model = options.model ?? this.defaultModel;
    const start = Date.now();

    const res = await fetch('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
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
      usage: { prompt_tokens: number; completion_tokens: number };
    };

    const text = data.choices[0]!.message.content;
    const inputTokens = data.usage.prompt_tokens;
    const outputTokens = data.usage.completion_tokens;

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
    return (input / 1_000_000) * 1.2 + (output / 1_000_000) * 1.2;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch('https://api.together.xyz/v1/models', {
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
