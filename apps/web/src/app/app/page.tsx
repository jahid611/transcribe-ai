'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Mic, FileText, TrendingUp, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';

interface MeResponse {
  email: string;
  name: string | null;
  tier: 'free' | 'pro' | 'enterprise';
  usage: {
    sessions_today: number;
    sessions_limit: number | null;
    llm_cost_this_month_usd: number;
    llm_cost_cap_usd: number | null;
  };
}

interface SummaryItem {
  id: string;
  sessionId: string;
  payload: { title: string; tldr: string };
  createdAt: number;
  provider: string;
  model: string;
  costUsd: number;
}

export default function DashboardPage() {
  const api = useApi();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [summaries, setSummaries] = useState<SummaryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [meData, sumData] = await Promise.all([
          api.get<MeResponse>('/v1/me'),
          api.get<{ data: SummaryItem[] }>('/v1/summaries'),
        ]);
        if (cancelled) return;
        setMe(meData);
        setSummaries(sumData.data);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Erreur de chargement');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <div className="text-muted-foreground">Chargement…</div>;
  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
        <AlertCircle className="h-4 w-4" /> {error}
      </div>
    );
  }
  if (!me) return null;

  const sessionsUsage =
    me.usage.sessions_limit != null
      ? `${me.usage.sessions_today} / ${me.usage.sessions_limit}`
      : `${me.usage.sessions_today}`;

  const costUsage =
    me.usage.llm_cost_cap_usd != null
      ? `$${me.usage.llm_cost_this_month_usd.toFixed(3)} / $${me.usage.llm_cost_cap_usd.toFixed(2)}`
      : `$${me.usage.llm_cost_this_month_usd.toFixed(3)}`;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Bonjour {me.name ?? me.email.split('@')[0]} 👋</h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant={me.tier === 'free' ? 'secondary' : 'default'}>
              tier · {me.tier}
            </Badge>
          </div>
        </div>
        <Link href="/app/record">
          <Button size="lg">
            <Mic className="h-4 w-4" /> Nouvelle session
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Sessions aujourd'hui</CardDescription>
            <CardTitle className="text-3xl">{sessionsUsage}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Coût LLM (ce mois)</CardDescription>
            <CardTitle className="text-3xl">{costUsage}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Résumés générés</CardDescription>
            <CardTitle className="text-3xl">{summaries.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div>
        <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
          <FileText className="h-5 w-5" /> Vos résumés récents
        </h2>
        {summaries.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              <TrendingUp className="mx-auto mb-3 h-10 w-10 opacity-40" />
              Aucun résumé pour l'instant. Lancez votre première session.
              <div className="mt-4">
                <Link href="/app/record">
                  <Button>Démarrer un enregistrement</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {summaries.map((s) => (
              <Link key={s.id} href={`/app/summaries/${s.id}`}>
                <Card className="transition-colors hover:bg-muted/30">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <CardTitle className="text-base">{s.payload.title}</CardTitle>
                        <CardDescription className="line-clamp-2">{s.payload.tldr}</CardDescription>
                      </div>
                      <div className="shrink-0 text-right text-xs text-muted-foreground">
                        {formatDate(s.createdAt * 1000)}
                        <div className="mt-1">{s.provider}</div>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
