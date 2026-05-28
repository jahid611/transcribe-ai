'use client';
import { Check } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const TIERS = [
  {
    id: 'free' as const,
    name: 'Free',
    price: '0 €',
    sub: 'pour découvrir',
    features: [
      'Transcription live Web Speech',
      '5 sessions / jour',
      'Résumé Groq LLaMA 3.3 70B',
      'Export TXT et Markdown',
      'Historique 30 jours',
    ],
    cta: 'Commencer gratuitement',
    href: '/app',
  },
  {
    id: 'pro' as const,
    name: 'Pro',
    price: '9 €',
    sub: '/mois',
    highlight: true,
    features: [
      'Upload fichiers (MP3/WAV/M4A) jusqu\'à 500 MB',
      'Whisper Groq transcription premium',
      '100 sessions / jour',
      'Export PDF + DOCX',
      'Historique 1 an + recherche',
      'Intégrations Notion/Slack (à venir)',
    ],
    cta: 'Passer Pro',
    href: '/app/billing',
  },
  {
    id: 'enterprise' as const,
    name: 'Enterprise',
    price: 'custom',
    sub: 'sur devis',
    features: [
      'SSO SAML/Okta',
      'Diarization (qui dit quoi)',
      'Modèles fine-tunés par domaine',
      'API publique + webhooks',
      'Audit logs 7 ans',
      'SLA 99.95 % + support dédié',
    ],
    cta: 'Nous contacter',
    href: 'mailto:sales@transcribe-ai.app',
  },
];

export function PricingGrid() {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {TIERS.map((tier) => (
        <Card
          key={tier.id}
          className={cn(tier.highlight && 'border-primary shadow-lg ring-1 ring-primary')}
        >
          <CardHeader>
            <CardTitle>{tier.name}</CardTitle>
            <CardDescription>
              <span className="text-3xl font-bold text-foreground">{tier.price}</span>{' '}
              <span className="text-muted-foreground">{tier.sub}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="space-y-2 text-sm">
              {tier.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Link href={tier.href} className="block pt-4">
              <Button className="w-full" variant={tier.highlight ? 'default' : 'outline'}>
                {tier.cta}
              </Button>
            </Link>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
