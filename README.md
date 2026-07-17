# Léo — Learn French (A1 → C1)

A structured French-learning platform: 84 lessons across CEFR A1–C1, deterministic
exercise generation (7 question types), gamified progress (XP, streaks, stars),
per-skill analytics, and honest scoring — nothing is faked, including pronunciation.

**Status: all 6 phases complete** (see `docs/ROADMAP.md`): accounts + curriculum +
lesson player (P1), SRS reviews, dictation, conjugation, numbers, arcade, placement,
badges (P2), AI tutor with real learner memory (P3 — set `ANTHROPIC_API_KEY` to enable),
daily planner, calendar, heatmap, reports, opt-in leaderboard (P4), notes, bookmarks,
full-text search, admin content editor, video curation (P5), and PWA offline lesson
packs (P6). Environment substitutions are documented as ADR-002/003/004 in
`docs/ARCHITECTURE.md`; deployment steps live in `docs/LAUNCH.md`.

## Stack

- **Next.js 14 (App Router) + React 18 + TypeScript** — RSC pages read the database
  directly; client mutations go through zod-validated API routes.
- **Tailwind CSS** with the "Cahier" design system (`docs/UIUX.md`).
- **NextAuth (credentials + JWT)** with bcrypt-hashed passwords.
- **SQLite via Node 22's built-in `node:sqlite`** behind typed repositories —
  no native build step, hermetic installs. Production swap path to Postgres/Prisma
  is documented in `docs/ARCHITECTURE.md` (ADR-001); the reference Prisma schema is
  `docs/prisma-schema-reference.prisma`.

## Quickstart

Requires **Node 22+** (the data layer uses `node:sqlite`).

```bash
npm ci
cp .env.example .env        # set NEXTAUTH_SECRET to any long random string
npm run db:seed             # creates leo.db with 84 lessons, 672 vocab items, badges
npm run dev                 # http://localhost:3000
```

Create an account at `/register`, then start Lesson 1.

## Quality gates

```bash
npm run typecheck   # tsc --noEmit
npm test            # 73 vitest tests across all six phases, including full user
                    # lifecycles against real temp databases
npm run build       # production build
```

CI (`.github/workflows/ci.yml`) runs all three on every push/PR. Four end-to-end
smoke suites (`scripts/smoke*.mjs`, ~40 checks total) drive the production server
over real HTTP: auth, lesson completion, SRS, placement, badges, tutor gating,
planner, calendar, reports, leaderboard, notes, search, admin, and PWA assets.

## Docker

```bash
docker build -t leo-platform .
docker run -p 3000:3000 -v leo-data:/data -e NEXTAUTH_SECRET=change-me leo-platform
```

## Project layout

See `docs/FOLDERS.md`. The short version: `src/lib/engine` is pure TypeScript
(exercise generation, graders, SRS, conjugation — fully unit-tested and shared by
server and client), `src/server` is the data layer, `src/app` is routes and UI.

## Documentation

| Doc | Contents |
| --- | --- |
| `docs/SRS.md` | Requirements FR-1..FR-14 with phase tags |
| `docs/ARCHITECTURE.md` | System design + ADR-001 (why node:sqlite) |
| `docs/DATABASE.md` | Schema reference |
| `docs/API.md` | Endpoint contracts per phase |
| `docs/UIUX.md` | Design system, tokens, interaction rules, a11y |
| `docs/ROADMAP.md` | Phases 1–6 |
| `docs/QA.md` | Test strategy + smoke script |

## Honesty constraints (by design)

- Speaking exercises use browser speech recognition for **word matching**, labeled
  as such — no fabricated "pronunciation scores".
- If speech recognition isn't available, speaking steps are excluded from scoring
  rather than silently marked correct.
- Progress numbers (accuracy, skills) are computed from real first-attempt answers.
