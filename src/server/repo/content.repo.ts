import { db, uid } from "@/server/db";

export interface NoteRow { lesson_number: number; body: string; updated_at: string }
export interface SearchHit { kind: "lesson" | "vocab"; ref: string; title: string; snippet: string }
export interface VideoRow { id: string; lesson_number: number; title: string; youtube_id: string; sort: number }

export const contentRepo = {
  /* ---------- notes ---------- */
  upsertNote(userId: string, lessonNumber: number, body: string): void {
    db.prepare(
      `INSERT INTO notes(id,user_id,lesson_number,body,updated_at) VALUES(?,?,?,?,datetime('now'))
       ON CONFLICT(user_id,lesson_number) DO UPDATE SET body=excluded.body, updated_at=datetime('now')`,
    ).run(uid(), userId, lessonNumber, body);
  },
  note(userId: string, lessonNumber: number): NoteRow | undefined {
    return db
      .prepare(`SELECT lesson_number, body, updated_at FROM notes WHERE user_id=? AND lesson_number=?`)
      .get(userId, lessonNumber) as NoteRow | undefined;
  },
  notes(userId: string): NoteRow[] {
    return db
      .prepare(`SELECT lesson_number, body, updated_at FROM notes WHERE user_id=? AND body != '' ORDER BY updated_at DESC`)
      .all(userId) as NoteRow[];
  },
  deleteNote(userId: string, lessonNumber: number): void {
    db.prepare(`DELETE FROM notes WHERE user_id=? AND lesson_number=?`).run(userId, lessonNumber);
  },

  /* ---------- bookmarks ---------- */
  toggleBookmark(userId: string, lessonNumber: number): boolean {
    const exists = db
      .prepare(`SELECT 1 FROM bookmarks WHERE user_id=? AND lesson_number=?`)
      .get(userId, lessonNumber);
    if (exists) {
      db.prepare(`DELETE FROM bookmarks WHERE user_id=? AND lesson_number=?`).run(userId, lessonNumber);
      return false;
    }
    db.prepare(`INSERT INTO bookmarks(user_id,lesson_number) VALUES(?,?)`).run(userId, lessonNumber);
    return true;
  },
  bookmarks(userId: string): number[] {
    return (
      db.prepare(`SELECT lesson_number FROM bookmarks WHERE user_id=? ORDER BY created_at DESC`).all(userId) as {
        lesson_number: number;
      }[]
    ).map((r) => r.lesson_number);
  },

  /* ---------- search (FTS5) ---------- */
  search(q: string, limit = 20): SearchHit[] {
    const cleaned = q.replace(/["'*^]/g, " ").trim();
    if (!cleaned) return [];
    // prefix-match each term for as-you-type feel
    const match = cleaned
      .split(/\s+/)
      .map((t) => `"${t}"*`)
      .join(" ");
    try {
      return db
        .prepare(
          `SELECT kind, ref, title, snippet(search_index, 3, '[[', ']]', '…', 12) as snippet
           FROM search_index WHERE search_index MATCH ? ORDER BY rank LIMIT ?`,
        )
        .all(match, limit) as SearchHit[];
    } catch {
      return []; // malformed query strings never 500
    }
  },

  /* ---------- admin: content editing ---------- */
  updateLessonText(lessonNumber: number, patch: { title?: string; objective?: string }): boolean {
    const sets: string[] = [];
    const vals: unknown[] = [];
    if (patch.title !== undefined) { sets.push("title=?"); vals.push(patch.title); }
    if (patch.objective !== undefined) { sets.push("objective=?"); vals.push(patch.objective); }
    if (!sets.length) return false;
    const r = db.prepare(`UPDATE lessons SET ${sets.join(",")} WHERE number=?`).run(...(vals as never[]), lessonNumber);
    if (Number(r.changes) > 0) this.reindexLesson(lessonNumber);
    return Number(r.changes) > 0;
  },
  updateVocab(lessonNumber: number, idx: number, patch: { fr?: string; en?: string; pron?: string }): boolean {
    const sets: string[] = [];
    const vals: unknown[] = [];
    for (const k of ["fr", "en", "pron"] as const) {
      if (patch[k] !== undefined) { sets.push(`${k}=?`); vals.push(patch[k]); }
    }
    if (!sets.length) return false;
    const r = db
      .prepare(
        `UPDATE vocab_items SET ${sets.join(",")}
         WHERE idx=? AND lesson_id=(SELECT id FROM lessons WHERE number=?)`,
      )
      .run(...(vals as never[]), idx, lessonNumber);
    if (Number(r.changes) > 0) this.reindexLesson(lessonNumber);
    return Number(r.changes) > 0;
  },
  /** Keep FTS in sync after edits (lesson row + its vocab rows). */
  reindexLesson(lessonNumber: number): void {
    db.prepare(`DELETE FROM search_index WHERE ref=?`).run(String(lessonNumber));
    const l = db
      .prepare(
        `SELECT number,title,objective,grammar_title,grammar_body,dialogue,writing_prompt FROM lessons WHERE number=?`,
      )
      .get(lessonNumber) as {
      number: number; title: string; objective: string; grammar_title: string;
      grammar_body: string; dialogue: string; writing_prompt: string;
    } | undefined;
    if (!l) return;
    const ins = db.prepare(`INSERT INTO search_index(kind,ref,title,body) VALUES(?,?,?,?)`);
    const body = [
      l.objective, l.grammar_title,
      (JSON.parse(l.grammar_body) as string[]).join(" "),
      (JSON.parse(l.dialogue) as { lines: { fr: string; en: string }[] }).lines.map((x) => `${x.fr} ${x.en}`).join(" "),
      l.writing_prompt,
    ].join(" ");
    ins.run("lesson", String(l.number), `Lesson ${l.number} · ${l.title}`, body);
    const vocab = db
      .prepare(
        `SELECT v.fr,v.en,v.pron,v.example_fr,v.example_en FROM vocab_items v
         WHERE v.lesson_id=(SELECT id FROM lessons WHERE number=?)`,
      )
      .all(lessonNumber) as { fr: string; en: string; pron: string; example_fr: string; example_en: string }[];
    for (const v of vocab) ins.run("vocab", String(lessonNumber), `${v.fr} — ${v.en}`, `${v.pron} ${v.example_fr} ${v.example_en}`);
  },

  /* ---------- videos ---------- */
  videos(lessonNumber: number): VideoRow[] {
    return db
      .prepare(`SELECT id,lesson_number,title,youtube_id,sort FROM videos WHERE lesson_number=? ORDER BY sort`)
      .all(lessonNumber) as VideoRow[];
  },
  addVideo(lessonNumber: number, title: string, youtubeId: string, sort = 0): string {
    const id = uid();
    db.prepare(`INSERT INTO videos(id,lesson_number,title,youtube_id,sort) VALUES(?,?,?,?,?)`).run(
      id, lessonNumber, title, youtubeId, sort,
    );
    return id;
  },
  deleteVideo(id: string): boolean {
    return Number(db.prepare(`DELETE FROM videos WHERE id=?`).run(id).changes) > 0;
  },

  /* ---------- roles ---------- */
  role(userId: string): string {
    const r = db.prepare(`SELECT role FROM profiles WHERE user_id=?`).get(userId) as { role?: string } | undefined;
    return r?.role ?? "user";
  },
  setRole(userId: string, role: "user" | "admin"): void {
    db.prepare(`UPDATE profiles SET role=? WHERE user_id=?`).run(role, userId);
  },
};
