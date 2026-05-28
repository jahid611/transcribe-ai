'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExportButtons } from '@/components/ExportButtons';
import { useApi } from '@/lib/api';
import { SummarySchema, type Summary } from '@transcribe-ai/shared';
import { formatDate, formatDuration } from '@/lib/utils';

interface SummaryDetail {
  id: string;
  session_id: string;
  transcript: string;
  duration_sec: number;
  payload: unknown;
  provider: string;
  model: string;
  cost_usd: number;
  created_at: number;
}

interface MeResponse {
  tier: 'free' | 'pro' | 'enterprise';
  limits: { can_export_pdf: boolean; can_export_docx: boolean };
}

export default function SummaryPage() {
  const { id } = useParams<{ id: string }>();
  const api = useApi();
  const router = useRouter();
  const [data, setData] = useState<SummaryDetail | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [detail, meData] = await Promise.all([
          api.get<SummaryDetail>(`/v1/summaries/${id}`),
          api.get<MeResponse>('/v1/me'),
        ]);
        setData(detail);
        setMe(meData);
        const parsed = SummarySchema.safeParse(detail.payload);
        if (parsed.success) setSummary(parsed.data);
        else setError('Format du résumé invalide.');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur de chargement');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function onDelete() {
    if (!confirm('Supprimer ce résumé ?')) return;
    setDeleting(true);
    try {
      await api.del(`/v1/summaries/${id}`);
      router.push('/app');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur suppression');
      setDeleting(false);
    }
  }

  if (error) return <div className="text-destructive">{error}</div>;
  if (!data || !summary || !me) {
    return (
      <div className="flex items-center text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Chargement…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/app" className="flex items-center gap-1 text-sm hover:underline">
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>
        <Button variant="ghost" size="sm" onClick={onDelete} disabled={deleting}>
          <Trash2 className="h-4 w-4" /> Supprimer
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{summary.title}</CardTitle>
          <p className="text-muted-foreground">{summary.tldr}</p>
          <div className="flex flex-wrap gap-2 pt-2 text-xs">
            <Badge variant="outline">{formatDate(data.created_at * 1000)}</Badge>
            <Badge variant="outline">{formatDuration(data.duration_sec)}</Badge>
            <Badge variant="secondary">{data.provider} · {data.model}</Badge>
            <Badge variant="outline">${data.cost_usd.toFixed(4)}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <ExportButtons
            summary={summary}
            transcript={data.transcript}
            canExportPdf={me.limits.can_export_pdf}
            canExportDocx={me.limits.can_export_docx}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Section title="Points clés">
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {summary.key_points.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </Section>

        <Section title="Décisions">
          {summary.decisions.length ? (
            <ul className="space-y-2 text-sm">
              {summary.decisions.map((d, i) => (
                <li key={i}>
                  <div className="font-medium">{d.decision}</div>
                  {d.owner && <div className="text-xs text-muted-foreground">{d.owner}</div>}
                </li>
              ))}
            </ul>
          ) : (
            <Empty />
          )}
        </Section>

        <Section title="Actions">
          {summary.actions.length ? (
            <ul className="space-y-2 text-sm">
              {summary.actions.map((a, i) => (
                <li key={i}>
                  <div className="font-medium">{a.action}</div>
                  <div className="text-xs text-muted-foreground">
                    {a.owner ?? 'aucun owner'}
                    {a.due ? ` · dû ${a.due}` : ''}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <Empty />
          )}
        </Section>

        <Section title="Participants & topics">
          <div className="space-y-3">
            <div>
              <div className="text-xs uppercase text-muted-foreground">Participants</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {summary.participants.length ? (
                  summary.participants.map((p) => (
                    <Badge key={p} variant="secondary">
                      {p}
                    </Badge>
                  ))
                ) : (
                  <Empty />
                )}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase text-muted-foreground">Topics</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {summary.topics.length ? (
                  summary.topics.map((t) => <Badge key={t}>{t}</Badge>)
                ) : (
                  <Empty />
                )}
              </div>
            </div>
          </div>
        </Section>
      </div>

      <Section title="Transcript brut">
        <pre className="whitespace-pre-wrap rounded-md bg-muted/40 p-4 text-xs">
          {data.transcript}
        </pre>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Empty() {
  return <span className="text-xs text-muted-foreground">— non précisé</span>;
}
