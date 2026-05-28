'use client';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { UploadCloud, FileAudio, Loader2, AlertCircle, Lock, X, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useApi } from '@/lib/api';
import { useJobStatus } from '@/lib/useJobStatus';
import {
  ACCEPTED_AUDIO_EXT,
  isAcceptedAudio,
  MB,
  type Tier,
} from '@transcribe-ai/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787';

interface MeResponse {
  tier: Tier;
  limits: { max_file_size_mb: number };
}

type Phase = 'idle' | 'uploading' | 'processing' | 'done' | 'error';

export function UploadRecorder({ language = 'fr' }: { language?: 'fr' | 'en' }) {
  const api = useApi();
  const router = useRouter();
  const { getToken } = useAuth();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [uploadPct, setUploadPct] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [tooLargeForFree, setTooLargeForFree] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const { job, cancel, canCancel } = useJobStatus(phase === 'processing' ? jobId : null);

  useEffect(() => {
    api.get<MeResponse>('/v1/me').then(setMe).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Réagit aux changements de statut du job.
  useEffect(() => {
    if (!job) return;
    if (job.status === 'completed' && job.summary_id) {
      setPhase('done');
      startTransition(() => router.push(`/app/summaries/${job.summary_id}`));
    } else if (job.status === 'failed') {
      setPhase('error');
      setError(job.error ?? 'Le traitement a échoué');
    } else if (job.status === 'cancelled') {
      setPhase('idle');
      setJobId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.status, job?.summary_id]);

  const maxMb = me?.limits.max_file_size_mb ?? 25;

  const validate = useCallback(
    (f: File): string | null => {
      if (!isAcceptedAudio(f.name, f.type)) {
        return `Format non supporté. Acceptés : ${ACCEPTED_AUDIO_EXT.join(', ')}.`;
      }
      if (me && f.size > maxMb * MB) {
        if (me.tier === 'free') {
          setTooLargeForFree(true);
          return `Fichier de ${(f.size / MB).toFixed(1)} MB — la limite Free est ${maxMb} MB.`;
        }
        return `Fichier trop volumineux (max ${maxMb} MB pour votre tier).`;
      }
      return null;
    },
    [me, maxMb],
  );

  function onPick(f: File | null) {
    setError(null);
    setTooLargeForFree(false);
    if (!f) return;
    const err = validate(f);
    if (err) {
      setError(err);
      setFile(null);
      return;
    }
    setFile(f);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0] ?? null;
    onPick(f);
  }

  async function submit() {
    if (!file) return;
    setError(null);
    setPhase('uploading');
    setUploadPct(0);

    try {
      const token = await getToken();
      const jid = await uploadWithProgress(file, language, token, setUploadPct);
      startTransition(() => {
        setJobId(jid);
        setPhase('processing');
      });
    } catch (err) {
      setPhase('error');
      setError(err instanceof Error ? err.message : "Échec de l'upload");
    }
  }

  function reset() {
    setFile(null);
    setJobId(null);
    setPhase('idle');
    setUploadPct(0);
    setError(null);
    setTooLargeForFree(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Importer un fichier audio</span>
          {me && <Badge variant="outline">max {maxMb} MB · {me.tier}</Badge>}
        </CardTitle>
        <CardDescription>
          mp3, mp4, wav, m4a, webm. Transcription Whisper (Groq) puis résumé automatique.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {phase === 'idle' && (
          <>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className={
                'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-10 text-center transition-colors ' +
                (dragging ? 'border-primary bg-primary/5' : 'border-input hover:bg-muted/30')
              }
            >
              <UploadCloud className="h-10 w-10 text-muted-foreground" />
              {file ? (
                <div className="flex items-center gap-2 text-sm">
                  <FileAudio className="h-4 w-4" /> {file.name}{' '}
                  <span className="text-muted-foreground">
                    ({(file.size / MB).toFixed(1)} MB)
                  </span>
                </div>
              ) : (
                <>
                  <div className="font-medium">Glissez un fichier ici</div>
                  <div className="text-sm text-muted-foreground">ou cliquez pour parcourir</div>
                </>
              )}
              <input
                ref={inputRef}
                type="file"
                accept=".mp3,.mp4,.wav,.m4a,.webm,audio/*,video/mp4"
                className="hidden"
                onChange={(e) => onPick(e.target.files?.[0] ?? null)}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={submit} disabled={!file}>
                <UploadCloud className="h-4 w-4" /> Transcrire & résumer
              </Button>
              {file && (
                <Button variant="ghost" onClick={() => setFile(null)}>
                  <X className="h-4 w-4" /> Retirer
                </Button>
              )}
            </div>
          </>
        )}

        {phase === 'uploading' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> Upload en cours… {uploadPct}%
            </div>
            <Progress value={uploadPct} />
          </div>
        )}

        {phase === 'processing' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              {job?.status_label ?? 'Traitement…'}
            </div>
            <Progress value={job?.progress ?? 5} />
            {canCancel && (
              <Button variant="outline" size="sm" onClick={cancel}>
                <X className="h-4 w-4" /> Annuler
              </Button>
            )}
          </div>
        )}

        {phase === 'done' && (
          <div className="flex items-center gap-2 text-sm text-emerald-600">
            <CheckCircle2 className="h-4 w-4" /> Terminé — redirection vers le résumé…
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="space-y-2">
              <div>{error}</div>
              {tooLargeForFree && (
                <Button size="sm" onClick={() => router.push('/app/billing')}>
                  <Lock className="h-4 w-4" /> Passer Pro (jusqu'à 2 GB)
                </Button>
              )}
              {phase === 'error' && (
                <Button size="sm" variant="outline" onClick={reset}>
                  Réessayer
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Progress({ value }: { value: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full bg-primary transition-all"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

function uploadWithProgress(
  file: File,
  language: string,
  token: string | null,
  onProgress: (pct: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('file', file);
    form.append('language', language);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_URL}/v1/transcribe/upload`);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let body: { job_id?: string; error?: { message?: string } } = {};
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        /* ignore */
      }
      if (xhr.status >= 200 && xhr.status < 300 && body.job_id) {
        resolve(body.job_id);
      } else {
        reject(new Error(body.error?.message ?? `Upload échoué (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error('Erreur réseau pendant l\'upload'));
    xhr.send(form);
  });
}
