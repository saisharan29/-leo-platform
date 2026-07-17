# Database Design · v1.0
Engine: PostgreSQL 16 (prod) / SQLite (dev). ORM: Prisma. All IDs cuid. Timestamps UTC.

## ERD (text)
User 1—1 Profile
User 1—N LessonProgress N—1 Lesson
User 1—N SrsCard N—1 VocabItem
User 1—N Attempt (question-level log)
User 1—N PlannerTask · 1—N Note · 1—N Badge(UserBadge) N—1 BadgeDef
Level 1—N Module 1—N Lesson 1—N VocabItem / DialogueLine
User 1—N AiSession 1—N AiMessage
User 1—N DailyStat (one row per active day → heatmap/reports)

## Tables (Prisma models)
- **User**(id, email uniq, passwordHash, createdAt) — auth only.
- **Profile**(userId PK/FK, displayName, avatar, dailyGoalXp int=50, theme enum[light,dark,system], tz text='Europe/Paris', xp int, coins int, gems int, streak int, streakBest int, lastStudyDate date)
- **Level**(id, code uniq[A1..C1], title, sort)
- **Module**(id, levelId FK, sort, title, bossLessonSort int)
- **Lesson**(id, moduleId FK, sort uniq-within-module, number int uniq 1..84, title, objective text, grammarTitle, grammarBody text[] json, grammarExamples json, dialogue json, videoQuery text, writingPrompt text)
- **VocabItem**(id, lessonId FK, fr, en, pron, exampleFr, exampleEn, examplePron, idx) — index (lessonId, idx)
- **LessonProgress**(id, userId+lessonId uniq, stars int 0-3, bestAccuracy int, completedAt, attempts int)
- **Attempt**(id, userId, lessonId?, qType enum, skill enum, correct bool, payload json, createdAt) — partitioned by month in prod; feeds weak-item mining & reports.
- **SrsCard**(id, userId+vocabItemId uniq, intervalIdx int=-1, dueAt datetime, lapses int, reps int)
- **PlannerTask**(id, userId, date date, kind enum[lesson,srs,dictation,conversation,video,quiz,revision,homework], refId?, title, minutes int, xpReward int, priority int, status enum[todo,in_progress,done,missed,rescheduled], completedAt?) — index (userId,date)
- **DailyStat**(id, userId+date uniq, xp int, minutes int, lessons int, wordsLearned int, correct int, answered int, skillsJson json)
- **BadgeDef**(id, code uniq, title, emoji, rule text) / **UserBadge**(userId+badgeId uniq, earnedAt)
- **Note**(id, userId, lessonId?, body text, pinned bool)
- **Bookmark**(userId+lessonId uniq)
- **AiSession**(id, userId, mode enum[chat,roleplay,interview,writing], scenario?, createdAt) / **AiMessage**(id, sessionId FK, role enum[user,assistant], content text, createdAt)

## Key decisions
1. **Content in DB, not code** — enables admin editing (P5) and search (P5); seeded from `prisma/seed-data/lessons.json` (the 84 validated lessons).
2. **Attempt log is the single source of truth** for accuracy, skills, weak items, reports; aggregates cached in DailyStat nightly (or on-write in dev).
3. **SRS intervals** stored as index into [1,3,7,14,30,60] days; algorithm documented in `src/lib/srs.ts`.
4. Referential integrity ON DELETE CASCADE from User → all personal data (GDPR erase = delete user row).
5. Dev/prod parity: schema written to be Postgres-safe (no SQLite-only types); provider switched by env.
