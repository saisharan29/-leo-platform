# Folder Structure · v1.0
```
leo-platform/
├─ docs/                    # this documentation suite + QA.md
├─ prisma/
│  ├─ schema.prisma
│  ├─ seed.ts               # loads seed-data into DB
│  └─ seed-data/lessons.json# 84 validated lessons (content source of truth)
├─ public/                  # icons, mascot.svg, manifest (P6)
├─ src/
│  ├─ app/                  # App Router
│  │  ├─ (auth)/login/page.tsx · register/page.tsx
│  │  ├─ (app)/             # authed shell (layout with nav)
│  │  │  ├─ dashboard/page.tsx
│  │  │  ├─ map/page.tsx
│  │  │  ├─ lesson/[number]/page.tsx      # player (client core)
│  │  │  ├─ review/page.tsx               # SRS (P2)
│  │  │  ├─ tutor/…(P3) · planner/…(P4) · reports/…(P4)
│  │  ├─ api/
│  │  │  ├─ auth/[...nextauth]/route.ts · auth/register/route.ts
│  │  │  ├─ levels/route.ts · lessons/[number]/route.ts · lessons/[number]/exercises/route.ts
│  │  │  ├─ progress/lesson/route.ts · me/route.ts
│  │  │  └─ srs|trainers|ai|planner|reports/… (per phase)
│  │  ├─ layout.tsx · globals.css
│  ├─ components/           # ui/ (Button, Card, Input…) + domain/ (LessonNode, QuestionFrame…)
│  ├─ lib/
│  │  ├─ engine/            # PURE, TESTED: exercises.ts srs.ts conjugator.ts numbers.ts diff.ts rng.ts types.ts
│  │  ├─ auth.ts (NextAuth opts) · db.ts (Prisma singleton) · zodschemas.ts · gamify.ts (xp/levels/badges)
│  │  └─ ai/ prompts.ts · client.ts (server-only)
│  ├─ server/services/      # progress.service.ts etc. (seam for future extraction)
│  └─ tests/                # vitest: engine + services + api (route handlers via next-test-api or direct)
├─ .env.example             # DATABASE_URL, NEXTAUTH_SECRET, ANTHROPIC_API_KEY
├─ Dockerfile · docker-compose.yml (postgres+app, P4)
├─ .github/workflows/ci.yml # lint → typecheck → test → build
└─ package.json · tsconfig.json · tailwind.config.ts · README.md
```
Rules: nothing in `lib/engine` imports React/Next/Prisma; components never query DB (props from RSC or fetch); every API route has a zod schema in `zodschemas.ts`.
