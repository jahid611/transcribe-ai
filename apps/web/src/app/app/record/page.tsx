'use client';
import { useState } from 'react';
import { Mic, UploadCloud } from 'lucide-react';
import { Recorder } from '@/components/Recorder';
import { UploadRecorder } from '@/components/UploadRecorder';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Mode = 'live' | 'upload';

export default function RecordPage() {
  const [language, setLanguage] = useState<'fr' | 'en'>('fr');
  const [mode, setMode] = useState<Mode>('live');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Nouvelle session</h1>
          <p className="text-muted-foreground">
            Transcription live (gratuit) ou import de fichier audio (Whisper).
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

      <div className="inline-flex rounded-lg border p-1">
        <button
          onClick={() => setMode('live')}
          className={cn(
            'flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors',
            mode === 'live' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
          )}
        >
          <Mic className="h-4 w-4" /> Live (Web Speech)
        </button>
        <button
          onClick={() => setMode('upload')}
          className={cn(
            'flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors',
            mode === 'upload' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
          )}
        >
          <UploadCloud className="h-4 w-4" /> Import fichier
        </button>
      </div>

      {mode === 'live' ? (
        <Recorder language={language} />
      ) : (
        <UploadRecorder language={language} />
      )}

      <Card>
        <CardContent className="flex items-start gap-3 py-4 text-sm text-muted-foreground">
          <Badge variant="outline">Astuce</Badge>
          <div>
            {mode === 'live'
              ? 'La qualité Web Speech dépend du navigateur (Chrome > Edge > Safari). Aucune donnée audio n\'est envoyée au serveur.'
              : 'Le fichier est transcrit côté serveur via Groq Whisper (whisper-large-v3) puis résumé par le LLMRouter. Le traitement est asynchrone : vous pouvez suivre la progression en direct.'}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
