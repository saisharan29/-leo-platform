# Development Roadmap · v1.0
Definition of Done (every phase): features complete per SRS tags · vitest green · `next build` clean · QA.md smoke pass · docs updated.

## Phase 1 — Foundation ✅ DONE
Scaffold (Next14+TS+Tailwind), Prisma schema+migrations+seed (84 lessons), auth (register/login/session), engine port (exercises·srs·conjugator·numbers·diff, seeded RNG) **with unit tests**, core screens: auth pages, app shell, dashboard, lesson map, lesson player (MCQ/fill/match/order/listen/type/speak), progress API (+XP/streak/stars/unlocks), design system tokens+base components, .env.example, README, CI workflow file.
Exit: a new user can register → see map → play lesson 1 fully → progress persists → tests pass.

## Phase 2 — Practice Depth ✅ DONE
SRS review screen+API · dictation · conjugation trainer UI · numbers dash · placement test · arcade games (memory/match/crossword/word-search/speed) · badges engine + toasts.

## Phase 3 — AI Tutor ✅ DONE (needs ANTHROPIC_API_KEY at deploy for live calls)
Server AI proxy w/ rate limits · memory pack builder (weak items from Attempt log) · chat & roleplay UI · writing coach · interview simulator · tutor policy tests (never-give-answer prompt evals).

## Phase 4 — Planner, Calendar, Reports ✅ DONE (Redis→SQLite per ADR-002; Lighthouse deferred to deploy)
Planner generator · calendar month view + day drill-down · heatmap · weekly/monthly reports (charts via Recharts, AI summaries) · leaderboard (opt-in) · Redis rate limiting · pino logging · Lighthouse ≥90 pass · Docker compose prod parity.

## Phase 5 — Content Ops & Search ✅ DONE (Postgres FTS→FTS5 per ADR-003)
Admin CRUD for lessons/vocab · notes/bookmarks · global search (Postgres FTS) · video curation table replacing search-queries.

## Phase 6 — PWA/Offline & Polish ✅ DONE (see docs/LAUNCH.md)
Service worker, lesson pack downloads, install prompts; perf budget audit; accessibility audit (axe) fixes; beta launch checklist.

Risks & mitigations: content volume (10k words) → phased authoring pipeline in P5, engine already supports arbitrary vocab; AI cost → per-user quotas (P3); speech accuracy honesty → UI copy fixed in design system (never "accent score").
