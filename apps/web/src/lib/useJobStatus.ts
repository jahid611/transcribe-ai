'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useApi } from '@/lib/api';

export type JobState = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface JobStatus {
  id: string;
  status: JobState;
  progress: number;
  status_label: string | null;
  file_name: string | null;
  duration_sec: number;
  summary_id: string | null;
  transcription_id: string | null;
  error: string | null;
  created_at: number;
}

const TERMINAL: JobState[] = ['completed', 'failed', 'cancelled'];

/** Poll GET /v1/jobs/:id toutes les 2s jusqu'à un état terminal. */
export function useJobStatus(jobId: string | null) {
  const api = useApi();
  const [job, setJob] = useState<JobStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!jobId) return;
    let active = true;

    async function tick() {
      try {
        const data = await api.get<JobStatus>(`/v1/jobs/${jobId}`);
        if (!active) return;
        setJob(data);
        if (TERMINAL.includes(data.status)) stop();
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Erreur de polling');
        stop();
      }
    }

    void tick();
    timerRef.current = setInterval(tick, 2000);

    return () => {
      active = false;
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  const cancel = useCallback(async () => {
    if (!jobId) return;
    try {
      await api.post(`/v1/jobs/${jobId}/cancel`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Annulation impossible');
    }
  }, [api, jobId]);

  const isTerminal = job ? TERMINAL.includes(job.status) : false;
  const canCancel =
    job != null &&
    (job.status === 'queued' || job.status === 'running') &&
    Date.now() - job.created_at * 1000 < 30_000;

  return { job, error, cancel, canCancel, isTerminal, stop };
}
