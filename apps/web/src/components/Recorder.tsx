'use client';
import { useEffect, useRef, useState } from 'react';
import { Mic, Square, Loader2, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useApi } from '@/lib/api';

type RecState = 'idle' | 'recording' | 'finalising' | 'summarising' | 'done' | 'error';

export function Recorder({ language = 'fr' }: { language?: 'fr' | 'en' }) {
  const api = useApi();
  const router = useRouter();
  const [state, setState] = useState<RecState>('idle');
  const [finalText, setFinalText] = useState('');
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const startTsRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  function start() {
    setError(null);
    setFinalText('');
    setInterim('');
    setElapsed(0);

    const SR =
      typeof window !== 'undefined'
        ? window.SpeechRecognition ?? window.webkitSpeechRecognition
        : undefined;
    if (!SR) {
      setError(
        "Votre navigateur ne supporte pas Web Speech API. Essayez Chrome ou Edge, ou passez Pro pour l'upload de fichiers.",
      );
      return;
    }

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language === 'en' ? 'en-US' : 'fr-FR';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let added = '';
      let pending = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (!r) continue;
        const alt = r[0];
        if (!alt) continue;
        if (r.isFinal) added += alt.transcript;
        else pending += alt.transcript;
      }
      if (added) setFinalText((prev) => prev + added);
      setInterim(pending);
    };

    recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      setError(`Erreur transcription : ${e.error}`);
      setState('error');
      recognition.stop();
    };

    recognition.onend = () => {
      if (state === 'recording') {
        try {
          recognition.start();
        } catch {
          /* ignore */
        }
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
      setState('recording');
      startTsRef.current = Date.now();
      timerRef.current = setInterval(() => {
        if (startTsRef.current) setElapsed((Date.now() - startTsRef.current) / 1000);
      }, 250);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de démarrer');
      setState('error');
    }
  }

  async function stop() {
    setState('finalising');
    recognitionRef.current?.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    const text = (finalText + ' ' + interim).trim();
    setInterim('');
    if (!text) {
      setError('Aucun texte capté. Essayez à nouveau.');
      setState('error');
      return;
    }
    try {
      setState('summarising');
      const res = await api.post<{ id: string }>('/v1/summaries', {
        transcript: text,
        language,
        durationSec: Math.round(elapsed),
        source: 'live',
      });
      router.push(`/app/summaries/${res.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur génération résumé');
      setState('error');
    }
  }

  const busy = state === 'recording' || state === 'finalising' || state === 'summarising';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Nouvelle session</span>
          {state === 'recording' && (
            <Badge variant="destructive">⏺ Enregistrement · {formatClock(elapsed)}</Badge>
          )}
          {state === 'summarising' && <Badge>Génération du résumé…</Badge>}
        </CardTitle>
        <CardDescription>
          La transcription est faite localement (Web Speech). Quand vous arrêtez, l'IA
          produit un résumé structuré.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3">
          {state !== 'recording' ? (
            <Button size="lg" onClick={start} disabled={busy}>
              <Mic className="h-4 w-4" /> Commencer
            </Button>
          ) : (
            <Button size="lg" variant="destructive" onClick={stop}>
              <Square className="h-4 w-4" /> Arrêter & résumer
            </Button>
          )}
          {state === 'summarising' && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> LLMRouter au travail…
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4" /> {error}
          </div>
        )}

        <div className="min-h-[200px] rounded-md border bg-muted/30 p-4 text-sm leading-relaxed">
          {finalText || interim ? (
            <>
              <span>{finalText}</span>
              <span className="text-muted-foreground italic">{interim}</span>
            </>
          ) : (
            <span className="text-muted-foreground">
              {state === 'idle'
                ? "Appuyez sur Commencer puis parlez. Vous verrez la transcription apparaître ici en temps réel."
                : 'En attente…'}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function formatClock(sec: number): string {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
