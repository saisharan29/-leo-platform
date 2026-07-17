// SQLite singleton (dev). Prod swap: Prisma/Postgres per ADR-001.
import { readFileSync } from "node:fs";
import path from "node:path";
import { DatabaseSync, type SqliteDatabase } from "./sqlite";

declare global {
  // eslint-disable-next-line no-var
  var __leoDb: SqliteDatabase | undefined;
}

function open(): SqliteDatabase {
  const file = process.env.DATABASE_FILE ?? path.join(process.cwd(), "dev.db");
  const db = new DatabaseSync(file);
  db.exec(readFileSync(path.join(process.cwd(), "db", "schema.sql"), "utf8"));
  // Guarded column migrations for databases created before Phase 2.
  for (const ddl of [
    "ALTER TABLE profiles ADD COLUMN placement_unlock INTEGER NOT NULL DEFAULT 1",
    "ALTER TABLE profiles ADD COLUMN role TEXT NOT NULL DEFAULT 'user'",
    "ALTER TABLE profiles ADD COLUMN leaderboard_opt_in INTEGER NOT NULL DEFAULT 0",
  ]) {
    try { db.exec(ddl); } catch { /* column already exists */ }
  }
  return db;
}

export const db: SqliteDatabase = globalThis.__leoDb ?? (globalThis.__leoDb = open());
export const uid = () => crypto.randomUUID();
