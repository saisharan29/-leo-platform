-- Léo platform · SQLite schema v1 (mirror of docs/prisma-schema-reference.prisma)
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS users(
  id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS profiles(
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL, avatar TEXT NOT NULL DEFAULT '🦊',
  daily_goal_xp INTEGER NOT NULL DEFAULT 50, theme TEXT NOT NULL DEFAULT 'system',
  tz TEXT NOT NULL DEFAULT 'Europe/Paris',
  xp INTEGER NOT NULL DEFAULT 0, coins INTEGER NOT NULL DEFAULT 0, gems INTEGER NOT NULL DEFAULT 0,
  streak INTEGER NOT NULL DEFAULT 0, streak_best INTEGER NOT NULL DEFAULT 0, last_study_date TEXT,
  placement_unlock INTEGER NOT NULL DEFAULT 1, role TEXT NOT NULL DEFAULT 'user', leaderboard_opt_in INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS levels(
  id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, title TEXT NOT NULL, sort INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS modules(
  id TEXT PRIMARY KEY, level_id TEXT NOT NULL REFERENCES levels(id),
  sort INTEGER NOT NULL, title TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS lessons(
  id TEXT PRIMARY KEY, module_id TEXT NOT NULL REFERENCES modules(id),
  sort INTEGER NOT NULL, number INTEGER NOT NULL UNIQUE,
  title TEXT NOT NULL, objective TEXT NOT NULL,
  grammar_title TEXT NOT NULL, grammar_body TEXT NOT NULL, grammar_examples TEXT NOT NULL,
  dialogue TEXT NOT NULL, video_query TEXT NOT NULL, writing_prompt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS vocab_items(
  id TEXT PRIMARY KEY, lesson_id TEXT NOT NULL REFERENCES lessons(id),
  idx INTEGER NOT NULL, fr TEXT NOT NULL, en TEXT NOT NULL, pron TEXT NOT NULL,
  example_fr TEXT NOT NULL DEFAULT '', example_en TEXT NOT NULL DEFAULT '', example_pron TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_vocab_lesson ON vocab_items(lesson_id, idx);
CREATE TABLE IF NOT EXISTS lesson_progress(
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL REFERENCES lessons(id),
  stars INTEGER NOT NULL DEFAULT 0, best_accuracy INTEGER NOT NULL DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 0, completed_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, lesson_id)
);
CREATE TABLE IF NOT EXISTS attempts(
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_number INTEGER, q_type TEXT NOT NULL, skill TEXT NOT NULL,
  correct INTEGER NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_attempts_user ON attempts(user_id, created_at);
CREATE TABLE IF NOT EXISTS srs_cards(
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vocab_item_id TEXT NOT NULL REFERENCES vocab_items(id),
  interval_idx INTEGER NOT NULL DEFAULT -1,
  due_at TEXT NOT NULL DEFAULT (datetime('now')),
  reps INTEGER NOT NULL DEFAULT 0, lapses INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, vocab_item_id)
);
CREATE INDEX IF NOT EXISTS idx_srs_due ON srs_cards(user_id, due_at);
CREATE TABLE IF NOT EXISTS badge_defs(
  id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, title TEXT NOT NULL, emoji TEXT NOT NULL, rule TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS user_badges(
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL REFERENCES badge_defs(id),
  earned_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY(user_id, badge_id)
);
CREATE TABLE IF NOT EXISTS daily_stats(
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL, xp INTEGER NOT NULL DEFAULT 0, minutes INTEGER NOT NULL DEFAULT 0,
  lessons INTEGER NOT NULL DEFAULT 0, correct INTEGER NOT NULL DEFAULT 0, answered INTEGER NOT NULL DEFAULT 0,
  skills TEXT NOT NULL DEFAULT '{}',
  UNIQUE(user_id, date)
);

-- ===== Phase 2+: practice, planner, notes (idempotent additions) =====
CREATE TABLE IF NOT EXISTS plan_tasks(
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  kind TEXT NOT NULL,           -- lesson|review|dictation|conjugation|numbers|arcade
  title TEXT NOT NULL,
  minutes INTEGER NOT NULL DEFAULT 10,
  xp INTEGER NOT NULL DEFAULT 10,
  priority INTEGER NOT NULL DEFAULT 2, -- 1 high, 2 normal, 3 low
  status TEXT NOT NULL DEFAULT 'todo', -- todo|doing|done|missed|moved
  sort INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, date, kind)
);
CREATE INDEX IF NOT EXISTS idx_plan_user_date ON plan_tasks(user_id, date);

CREATE TABLE IF NOT EXISTS notes(
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_number INTEGER NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, lesson_number)
);

CREATE TABLE IF NOT EXISTS bookmarks(
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_number INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY(user_id, lesson_number)
);

-- ===== Phase 2-6 additions =====
CREATE TABLE IF NOT EXISTS ai_usage(
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL, calls INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(user_id, date)
);
CREATE TABLE IF NOT EXISTS videos(
  id TEXT PRIMARY KEY, lesson_number INTEGER NOT NULL,
  title TEXT NOT NULL, youtube_id TEXT NOT NULL, sort INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_videos_lesson ON videos(lesson_number, sort);
CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
  kind, ref, title, body, tokenize='unicode61 remove_diacritics 2'
);
