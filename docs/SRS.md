# Léo — AI-Powered French Learning Platform
## Software Requirements Specification (SRS) · v1.0 · 2026-07-08

### 1. Purpose & Scope
Web platform teaching French A1→C1 for learners who intend to live, study, and work in France (DELF B2 / DALF C1 target). Combines structured CEFR curriculum, AI tutoring (Claude API), spaced repetition, gamification, planning/calendar, and analytics. This SRS governs all phases; features are tagged with their delivery phase (P1–P6, see ROADMAP.md).

### 2. Users & Roles
- **Learner** (default): studies, tracks progress, uses AI tutor.
- **Admin** (P5): manages content, views aggregate analytics.

### 3. Functional Requirements
FR-1 **Auth & Accounts (P1)**: email+password registration/login (NextAuth credentials, bcrypt ≥12 rounds), session JWT, profile (name, avatar, daily goal). FR-1.3 Account deletion (GDPR).
FR-2 **Curriculum (P1)**: 5 CEFR levels → 14 modules → 84 lessons. Lesson = objectives, grammar theory w/ examples, 8-word vocabulary (FR/EN/pronunciation/example), dialogue, video reference, writing prompt. Content stored in DB, seeded from validated dataset.
FR-3 **Exercise Engine (P1)**: ≥25 generated questions/lesson across ≥8 types (MCQ both directions, fill-blank, match, order, listen, type-translation, speak, grammar, reading). Every question carries an explanation; wrong answers requeue once (retry-until-understood). Deterministic given (lessonId, seed) for reproducibility/tests.
FR-4 **Progress (P1)**: per-user lesson completions (stars, accuracy), XP/coins/gems, streak (Europe/Paris day boundary), per-skill rolling scores (speaking/listening/reading/writing/vocab/grammar), weak-item tracking.
FR-5 **SRS (P2)**: per-user card per vocab item; intervals 1/3/7/14/30/60 d; grades Again/Good/Easy; due queue endpoint; review sessions award XP.
FR-6 **Trainers (P2)**: dictation (word-diff grading), conjugation (engine: 6 tenses, ≥39 verbs), numbers/dates listening, placement test (30 adaptive Qs → unlock recommendation).
FR-7 **AI Tutor (P3)**: chat + roleplay scenarios (restaurant, bank, doctor, interview, etc.), writing grading (/20 with corrections), interview simulator. Server-side Claude API proxy; per-user memory: tutor receives structured learner profile (level, weak items, recent errors) — FR-7.4 tutor never reveals answers directly (system prompt policy).
FR-8 **Planner & Calendar (P4)**: auto-generated daily plan (tasks: lesson, SRS, dictation, conversation…, each with duration/XP/priority); task states Not-started/In-progress/Done/Missed/Rescheduled; month calendar with day drill-down; GitHub-style yearly heatmap.
FR-9 **Reports (P4)**: weekly & monthly reports (hours, lessons, words, per-skill deltas, accuracy, weak/strong areas, charts, AI feedback paragraph, next-week goals).
FR-10 **Gamification (P1 core, P4 extended)**: XP levels, coins, gems, ≥16 badges, daily reward, boss challenges per module; P4: leaderboard (opt-in, pseudonymous), mystery boxes.
FR-11 **Games (P2)**: memory, match, word-search, crossword, speed quiz, sentence builder, listening dash, echo booth (record & compare — no fake accent scores).
FR-12 **Notes & Search (P5)**: per-lesson notes, bookmarks, saved vocab; global search over lessons/vocab/grammar/notes.
FR-13 **Accessibility & i18n UI (P1 baseline)**: WCAG 2.1 AA targets, dark/light, keyboard nav, reduced motion, responsive 360px→desktop.
FR-14 **Offline (P6)**: PWA shell + downloaded lesson packs.

### 4. Non-Functional Requirements
NFR-1 Performance: TTFB <300ms (cached), lesson play interactions <50ms; Lighthouse ≥90 (P4 gate).
NFR-2 Security: OWASP ASVS L1; passwords bcrypt; all AI keys server-side only; rate limiting on auth & AI routes; input validation with zod on every API route.
NFR-3 Reliability: exercise generator unit-tested (≥90% branch coverage of engine libs); CI must pass before merge.
NFR-4 Privacy: learner data exportable & deletable; AI prompts exclude PII beyond first name.
NFR-5 Honesty constraints: no fabricated pronunciation scores — speech features measure word match & fluency proxies and say so in UI.
NFR-6 Scalability: stateless app servers; Postgres + Redis (sessions/queues) in production; SQLite acceptable in dev only.

### 5. Out of Scope (v1)
Native mobile apps, human tutor marketplace, payments, social feed.

### 6. Acceptance Criteria (per phase)
Each phase ships only when: all its FRs implemented, `npm test` green, `npm run build` clean, manual smoke script in docs/QA.md passes, no console errors on happy paths.
