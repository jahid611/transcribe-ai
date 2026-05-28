import { LLMProviderError } from '@transcribe-ai/shared';
import type { LLMMessage, LLMProvider, SummarizeOptions, SummarizeResult } from '../types';

const PRICING: Record<string, { input: number; output: number }> = {
  'llama-3.3-70b-versatile': { input: 0.59, output: 0.79 },
  'llama-3.1-8b-instant': { input: 0.05, output: 0.08 },
  'mixtral-8x7b-32768': { input: 0.24, output: 0.24 },
};

export class GroqProvider implements LLMProvider {
  readonly id = 'groq';
  readonly displayName = 'Groq';

  constructor(
    private readonly apiKey: string,
    private readonly defaultModel = 'llama-3.3-70b-versatile',
  ) {}

  async summarize(
    messages: LLMMessage[],
    options: SummarizeOptions = {},
  ): Promise<SummarizeResult> {
    const model = options.model ?? this.defaultModel;
    const start = Date.now();

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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
    const p = PRICING[this.defaultModel] ?? PRICING['llama-3.3-70b-versatile']!;
    return (input / 1_000_000) * p.input + (output / 1_000_000) * p.output;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/models', {
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
