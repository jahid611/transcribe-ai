'use client';
import { useState } from 'react';
import { Recorder } from '@/components/Recorder';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function RecordPage() {
  const [language, setLanguage] = useState<'fr' | 'en'>('fr');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Enregistrement</h1>
          <p className="text-muted-foreground">
            Web Speech API client-side · gratuit · aucune donnée audio envoyée au serveur.
          </p>
        </div>
        <div className="flex gap-2">
          {(['fr', 'en'] as const).map((lng) => (
            <button
              key={lng}
              onClick={() => setLanguage(lng)}
              className={
                'rounded-md border px-3 py-1.5 text-sm ' +
                (language === lng ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')
              }
            >
              {lng.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <Recorder language={language} />

      <Card>
        <CardContent className="flex items-start gap-3 py-4 text-sm text-muted-foreground">
          <Badge variant="outline">Astuce</Badge>
          <div>
            La qualité de la transcription dépend du navigateur (Chrome &gt; Edge &gt; Safari).
            Pour la transcription Whisper et l'upload de fichiers, passez en{' '}
            <a href="/app/billing" className="underline">tier Pro</a>.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
