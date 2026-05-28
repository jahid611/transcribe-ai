# 🎙️ transcribe-ai

SaaS de transcription audio + résumé IA. Monorepo full-stack.

## 📐 Architecture

- **apps/web** — Next.js 14 (App Router) + Tailwind + shadcn/ui + Clerk
- **apps/api** — Hono.js sur Cloudflare Workers
- **packages/llm-router** — couche d'abstraction LLM (Groq → OpenRouter → Together) avec Circuit Breaker
- **packages/db** — schéma Drizzle + client Turso (libSQL)
- **packages/shared** — types partagés

> Doc d'architecture : voir [/Users/jahidsayad/docs](/Users/jahidsayad/docs) (ou `../docs` selon le checkout).

## 🚀 Démarrage

```bash
pnpm install
cp .env.example .env.local        # remplir les clés (Clerk, Groq, Turso…)
pnpm db:push                       # crée le schéma local SQLite
pnpm dev                           # lance web + api en parallèle
```

Mode **stub** (sans aucune clé, démo locale) :

```bash
STUB=true pnpm dev
```

## 📜 Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Lance toutes les apps en watch |
| `pnpm build` | Build production de tout le monorepo |
| `pnpm typecheck` | TypeScript strict sur tous les packages |
| `pnpm db:push` | Push le schéma Drizzle vers Turso/SQLite local |
| `pnpm db:studio` | Drizzle Studio (UI DB) |

## 💸 Tiers

- **Free** : Web Speech client-side, 5 sessions/jour, résumé Groq
- **Pro (9 €/mois)** : Upload + Whisper Groq, 100 sessions/jour, export PDF/DOCX
- **Enterprise** : custom, SSO, API

Détails dans `docs/scaling/TIERS.md`.

## 🔐 Stratégie LLM

**Pay-as-you-go uniquement** — pas de provider à quota dur (cf. `docs/llm/STRATEGY.md`).

Routage : `Groq` (primary) → `OpenRouter` (fallback) → `Together AI` (emergency).
Circuit Breaker à 5 erreurs / 60s.

## 📄 Licence

Propriétaire.
