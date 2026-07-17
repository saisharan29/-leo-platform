# API Documentation · v1.0
Base: `/api`. Auth: NextAuth session cookie (JWT). All bodies JSON; all inputs zod-validated; errors: `{error:{code,message}}` with proper HTTP status. Phase tags mark availability.

## Auth (P1)
- `POST /api/auth/register` {email, password≥8, displayName} → 201 {userId}. 409 if email taken.
- NextAuth handles `/api/auth/[...nextauth]` (login `signIn('credentials')`, logout, session).

## Curriculum (P1)
- `GET /api/levels` → [{code,title,modules:[{id,title,lessons:[{number,title,stars,locked}]}]}] (merged with caller's progress)
- `GET /api/lessons/:number` → full lesson (objectives, grammar, vocab[8], dialogue, videoQuery, writingPrompt). 401 if locked for user.
- `GET /api/lessons/:number/exercises?seed=` → {seed, questions:[...]} ≥25 generated questions (server-generated so clients can't cheat by reading answers? — answers included; anti-cheat is out of scope v1, documented).

## Progress (P1)
- `POST /api/progress/lesson` {lessonNumber, accuracy 0-100, stars 0-3, xp, answers:[{qType,skill,correct}]} → updated {xp,coins,gems,streak,unlockedThrough}
- `GET /api/me` → profile + stats (xp, level, streak, skills, weakItems top20)
- `PATCH /api/me` {displayName?, avatar?, dailyGoalXp?, theme?}
- `DELETE /api/me` → GDPR cascade delete, 204.

## SRS (P2)
- `GET /api/srs/due` → {count, cards:[{id, fr, en, pron, exampleFr}] ≤25}
- `POST /api/srs/grade` {cardId, grade: "again"|"good"|"easy"} → {nextDueAt, intervalIdx}

## Trainers (P2)
- `POST /api/trainers/dictation/next` {} → {sentenceFr, translation} (from unlocked pool)
- `POST /api/trainers/placement/answer` … adaptive session (server-held state) → final {recommendedLevel, unlockLesson}

## AI (P3) — server-proxied, rate-limited 20 req/10min/user
- `POST /api/ai/chat` {sessionId?, mode, scenario?, message} → {sessionId, reply}. Server injects learner memory pack (level, weak vocab/grammar top10, last 5 error types).
- `POST /api/ai/write` {text, promptId?} → {corrected, mistakes:[{quote,fix,rule}], tip, score20}

## Planner & Reports (P4)
- `GET /api/planner?date=` · `POST /api/planner/generate` {date} · `PATCH /api/planner/task/:id` {status}
- `GET /api/reports/weekly?week=` · `GET /api/reports/monthly?month=` → aggregates + AI summary
- `GET /api/stats/heatmap?year=` → [{date, xp, level0-4}]

## Conventions
Pagination `?cursor=`; dates ISO-8601; all times stored UTC, rendered in profile tz. Rate limits (P4, Redis): auth 5/min/IP, AI as above. Versioning: additive only until /api/v2.
