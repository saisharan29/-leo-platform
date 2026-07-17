# Launch checklist

## Before first deploy
- [ ] Set `NEXTAUTH_SECRET` (long random string) and `NEXTAUTH_URL` (public URL)
- [ ] Set `ANTHROPIC_API_KEY` to enable the AI tutor (route returns honest 503 without it)
- [ ] Mount a persistent volume for `DATABASE_FILE` (Docker: `/data`)
- [ ] Run `node scripts/make-admin.mjs you@email` after registering, to unlock /admin
- [ ] Curate at least 1–2 YouTube videos per early lesson via /admin (learners see an
      honest "search YouTube" link until then)

## Verification (each deploy)
- [ ] `npm run typecheck && npm test && npm run build` all green (CI enforces)
- [ ] `scripts/smoke.mjs`, `smoke-phase2.mjs`, `smoke-phase34.mjs`, `smoke-phase56.mjs`
      against the deployed URL
- [ ] Lighthouse run on /dashboard and /lesson/1 (target ≥90 perf/a11y) — requires a
      real browser, not available in the build sandbox
- [ ] Install prompt appears on mobile (manifest + SW registered)
- [ ] Download a lesson pack, go airplane-mode, confirm the lesson still opens

## Performance budget (from production build)
- Shared JS baseline ~94 kB gzip; largest route /reports ~195 kB (recharts, route-scoped)
- No route should exceed 220 kB first-load JS without a documented reason

## Known limits (honest by design)
- Speaking = word-match via browser speech recognition, never an "accent score"
- 672 seeded vocab items; growth path is the /admin editor (Phase 5) and the
  authoring pipeline sketched in ROADMAP risks
- Single-node SQLite; ADR-001/002/003 document the Postgres/Redis swap paths
