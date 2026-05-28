import Link from 'next/link';
import { Mic, Sparkles, Shield, Zap, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PricingGrid } from '@/components/PricingGrid';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Mic className="h-5 w-5" />
            transcribe-ai
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="#features" className="hover:underline">Features</Link>
            <Link href="#pricing" className="hover:underline">Pricing</Link>
            <Link href="/app">
              <Button size="sm">Ouvrir l'app</Button>
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border bg-muted/40 px-3 py-1 text-xs">
          <Sparkles className="h-3 w-3" /> Pay-as-you-go · sans quota dur
        </div>
        <h1 className="mx-auto max-w-3xl text-balance text-5xl font-bold tracking-tight">
          Vos réunions, transcrites et résumées en quelques secondes.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Enregistrez votre voix ou uploadez un fichier audio. Notre IA produit un résumé
          structuré (décisions, actions, participants) prêt à partager.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/app/record">
            <Button size="lg">
              Commencer gratuitement <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="#pricing">
            <Button size="lg" variant="outline">Voir les prix</Button>
          </Link>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-6 pb-20">
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <Mic className="h-6 w-6" />
              <CardTitle>Transcription temps réel</CardTitle>
              <CardDescription>
                Web Speech (gratuit) ou Whisper (Pro) pour les enregistrements importés.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <Sparkles className="h-6 w-6" />
              <CardTitle>Résumés structurés</CardTitle>
              <CardDescription>
                Title, TL;DR, décisions, actions, participants, topics — au format JSON validé.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <Zap className="h-6 w-6" />
              <CardTitle>Routage LLM</CardTitle>
              <CardDescription>
                Groq → OpenRouter → Together. Circuit breaker intégré. Jamais d'interruption.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <Shield className="h-6 w-6" />
              <CardTitle>RGPD friendly</CardTitle>
              <CardDescription>
                Hébergement EU. Export ou suppression de vos données à tout moment.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <Zap className="h-6 w-6" />
              <CardTitle>Export multi-format</CardTitle>
              <CardDescription>
                TXT, Markdown (Free) — PDF, DOCX (Pro). Push direct Notion/Slack à venir.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <Sparkles className="h-6 w-6" />
              <CardTitle>Pas de quota dur</CardTitle>
              <CardDescription>
                Stratégie pay-as-you-go uniquement. Pas de coupure brutale en milieu de journée.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-6xl px-6 pb-24">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold">Pricing simple, sans quotas durs</h2>
          <p className="mt-2 text-muted-foreground">Choisissez votre tier. Changez quand vous voulez.</p>
        </div>
        <PricingGrid />
      </section>

      <footer className="border-t py-10 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} transcribe-ai. Pay-as-you-go, sans quota dur.
      </footer>
    </div>
  );
}
