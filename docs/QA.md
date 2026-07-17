# QA — Phase 1 Smoke Script
1 Register new user (bad email rejected, short pw rejected, dup email 409) → auto-login → lands on dashboard.
2 Dashboard shows 0 XP, streak 0, "Start Lesson 1".
3 Map: lesson 1 unlocked, 2+ locked; module headers visible; keyboard focus order sane.
4 Play lesson 1 teach phase → ≥25 questions; verify one of each: MCQ, fill, match (complete all pairs — counter reaches 0 and Continue appears), order, listen (TTS button), type, speak (skip path when no mic).
5 Answer one wrong → explanation banner → question returns later → hearts decrement.
6 Finish → stars/XP/coins awarded → dashboard reflects → lesson 2 unlocked → reload persists.
7 /api/me returns updated stats; logout → protected routes redirect to login.
8 Dark mode toggle persists; reduced-motion (emulate) disables confetti; 375px viewport: no horizontal scroll on all P1 screens.
9 `npm test` green; `npm run build` clean.

## End-to-end smoke script (implemented)

`scripts/smoke.mjs` drives the production build over real HTTP and asserts:
register (201) → duplicate register (409) → CSRF + credentials login (session
cookie) → `/api/me` (profile + 84 lessons) → `/api/levels` (14 modules) →
lesson 1 exercises (≥25 questions) → locked lesson 9 (403) → complete lesson 1
(stars=2 at 87%, unlockedThrough=2) → lesson 2 now accessible → dashboard RSC
greets the user and points at Lesson 2 → map renders → lesson player renders →
locked lesson page redirects to /map.

Last full run: all 12 checks passed against `next start` on the seeded QA database.
