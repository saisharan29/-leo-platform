// node:sqlite loader — via createRequire so bundlers (vite/next) don't try to
// resolve a builtin they don't know yet, and so @types/node@20 users get types.
import { createRequire } from "node:module";

export interface SqliteStatement {
  run(...params: unknown[]): { changes: number | bigint; lastInsertRowid: number | bigint };
  get(...params: unknown[]): unknown;
  all(...params: unknown[]): unknown[];
}
export interface SqliteDatabase {
  exec(sql: string): void;
  prepare(sql: string): SqliteStatement;
  close(): void;
}

const require = createRequire(import.meta.url);
const mod = require("node:sqlite") as { DatabaseSync: new (path: string) => SqliteDatabase };

export const DatabaseSync = mod.DatabaseSync;
