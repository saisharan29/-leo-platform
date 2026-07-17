# System Architecture · v1.0

## Overview
Modular monolith on Next.js 14 (App Router) — right-sized for a solo/startup team; splits into services only if scale demands (documented seams below).

```
┌─────────────────────────── Browser (PWA, P6) ───────────────────────────┐
│ React 18 · TS · Tailwind · Framer Motion · Web Speech API (TTS/STT)     │
└──────────────┬───────────────────────────────────────────────────────────┘
               │ HTTPS (fetch, Server Actions)
┌──────────────▼───────────────────────────────────────────────────────────┐
│ Next.js app (Node 20)                                                    │
│  • App Router pages (RSC)      • API route handlers /api/*               │
│  • NextAuth (JWT sessions)     • zod validation on every input           │
│  • lib/engine: exercises · srs · conjugator · numbers (pure TS, tested)  │
│  • lib/ai: Claude proxy (server-only key), prompt builders, memory pack  │
└───────┬──────────────────────────────┬───────────────────────────────────┘
        │ Prisma                        │ HTTPS
┌───────▼────────┐  ┌────────────┐  ┌───▼──────────────┐
│ PostgreSQL 16  │  │ Redis (P4) │  │ Anthropic API    │
│ (SQLite dev)   │  │ rate-limit │  │ (AI tutor)       │
└────────────────┘  │ queues     │  └──────────────────┘
                    └────────────┘
```

## Principles
- **Pure engine core**: everything gradeable (exercise gen, SRS scheduling, conjugation, diffing) is pure TypeScript in `src/lib/engine/` with no I/O → unit-testable, reusable in offline PWA.
- **Server-only secrets**: Anthropic key never reaches the client; `/api/ai/*` proxies with per-user rate limits.
- **RSC-first**: data-heavy screens (dashboard, map, reports) are server components; interactive players are client components fed by serializable props.
- **Determinism for tests**: generator takes an explicit RNG seed.
- **Honest speech**: STT via browser SpeechRecognition where available; server never claims accent scoring.

## Cross-cutting
AuthZ: session userId scoping in every query (no raw id from client). Errors: typed Result returns in engine; route handlers map to RFC7807-style JSON. Logging: pino (P4). CI: GitHub Actions — lint, typecheck, vitest, build (config in P1). Deployment: Docker → Render/Fly; `DATABASE_URL` switches provider.

## Service seams (future)
ai-tutor (stateless) · reports cron worker · content service. Each already isolated behind `src/server/services/*` interfaces.

## ADR-001 · Data layer (2026-07-08)
**Context**: build environment blocks Prisma engine binaries and node-gyp header downloads. **Decision**: dev data layer implemented on Node 22 built-in `node:sqlite` behind typed repositories (`src/server/repo/*`); SQL schema in `db/schema.sql`. **Prod path**: swap repositories to Prisma/Postgres using `docs/prisma-schema-reference.prisma` (field-for-field identical). **Consequences**: zero native deps, fully testable; repositories are the enforced seam — no SQL outside `src/server/repo`.

## ADR-002 — In-process rate limiting instead of Redis (Phase 3/4)
The roadmap assumed Redis for AI quota + rate limits. This build uses the `ai_usage`
SQLite table (per-user daily counters, Paris-midnight reset) — durable across restarts,
correct for a single-node deployment. Swap path: replace `aiRepo.consumeQuota` with a
Redis INCR+EXPIRE when scaling to multiple nodes. Interface stays identical.

## ADR-003 — SQLite FTS5 instead of Postgres FTS (Phase 5)
Global search uses an FTS5 virtual table (`search_index`) with
`unicode61 remove_diacritics 2` (so "cafe" finds "café") and per-term prefix matching.
Seed rebuilds the whole index; admin content edits reindex the touched lesson.
Swap path: `contentRepo.search` maps 1:1 to a Postgres `tsvector` query.

## ADR-004 — Hand-rolled service worker instead of next-pwa (Phase 6)
`public/sw.js` implements exactly three behaviors: cache-first static assets,
network-first navigation with `/offline` fallback, and explicit lesson-pack downloads
via `postMessage({type:'CACHE_LESSON'})`. Progress APIs are deliberately network-only —
stale progress data must never be served.
