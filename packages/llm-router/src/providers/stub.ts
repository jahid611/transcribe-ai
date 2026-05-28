import type { LLMMessage, LLMProvider, SummarizeOptions, SummarizeResult } from '../types';

export class StubProvider implements LLMProvider {
  readonly id = 'stub';
  readonly displayName = 'Stub (dev)';

  async summarize(
    messages: LLMMessage[],
    options: SummarizeOptions = {},
  ): Promise<SummarizeResult> {
    const start = Date.now();
    const transcript = messages[messages.length - 1]?.content ?? '';
    const sample = transcript.slice(0, 80).replace(/\s+/g, ' ').trim();

    const json = {
      title: sample ? `Notes — ${sample.slice(0, 60)}` : 'Sample summary',
      tldr: 'Résumé de démonstration généré par le StubProvider (aucune clé API).',
      key_points: [
        'Premier point clé identifié dans le transcript.',
        'Deuxième point intéressant à retenir.',
        'Troisième sujet abordé pendant la session.',
      ],
      decisions: [{ decision: 'Décision exemple à valider', owner: null }],
      actions: [{ action: 'Action exemple à réaliser', owner: null, due: null }],
      participants: ['Speaker 1'],
      topics: ['demo', 'stub', 'transcribe-ai'],
    };
    const text = JSON.stringify(json);

    await new Promise((r) => setTimeout(r, 80));

    return {
      text,
      json: options.jsonMode ? json : undefined,
      usage: { inputTokens: 100, outputTokens: 50 },
      model: 'stub-1.0',
      provider: this.id,
      costUsd: 0,
      latencyMs: Date.now() - start,
    };
  }

  estimateCost(): number {
    return 0;
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}
