'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Check, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useApi } from '@/lib/api';

interface MeResponse {
  tier: 'free' | 'pro' | 'enterprise';
  email: string;
}

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="text-muted-foreground">Chargement…</div>}>
      <BillingContent />
    </Suspense>
  );
}

function BillingContent() {
  const api = useApi();
  const sp = useSearchParams();
  const upgraded = sp.get('upgraded');
  const cancelled = sp.get('cancelled');
  const [me, setMe] = useState<MeResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<MeResponse>('/v1/me').then(setMe).catch((e) => setError(String(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function upgrade() {
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<{ url: string }>('/v1/stripe/checkout');
      window.location.href = res.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Plan & facturation</h1>
        <p className="text-muted-foreground">
          Pay-as-you-go. Pas de quota dur. Modifiable à tout moment.
        </p>
      </div>

      {upgraded && (
        <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm">
          ✅ Bienvenue dans Pro ! Vos quotas ont été mis à jour.
        </div>
      )}
      {cancelled && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          Paiement annulé. Vous restez sur le tier Free.
        </div>
      )}
      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Votre plan actuel</CardTitle>
          <CardDescription>
            <Badge>{me?.tier ?? '…'}</Badge>
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Free</CardTitle>
            <CardDescription>
              <span className="text-3xl font-bold text-foreground">0 €</span> / mois
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              <Feat>Web Speech transcription</Feat>
              <Feat>5 sessions / jour</Feat>
              <Feat>Export TXT et Markdown</Feat>
              <Feat>Historique 30 jours</Feat>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-primary ring-1 ring-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> Pro
            </CardTitle>
            <CardDescription>
              <span className="text-3xl font-bold text-foreground">9 €</span> / mois
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-1 text-sm">
              <Feat>Upload fichiers jusqu'à 500 MB</Feat>
              <Feat>Whisper Groq premium</Feat>
              <Feat>100 sessions / jour</Feat>
              <Feat>Export PDF + DOCX</Feat>
              <Feat>Historique 1 an</Feat>
            </ul>
            <Button onClick={upgrade} disabled={busy || me?.tier === 'pro'} className="w-full">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {me?.tier === 'pro' ? 'Déjà Pro' : 'Passer Pro'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Feat({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <Check className="mt-0.5 h-4 w-4 shrink-0" /> {children}
    </li>
  );
}
