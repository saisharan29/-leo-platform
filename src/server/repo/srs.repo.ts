import { randomUUID } from "node:crypto";
import { db } from "@/server/db";
import { scheduleSrs, type SrsGrade } from "@/lib/engine/srs";

export interface DueCard {
  id: string;
  fr: string;
  en: string;
  pron: string;
  exampleFr: string;
  exampleEn: string;
  reps: number;
  lapses: number;
}

export const srsRepo = {
  /** Add every vocab item of a lesson to the user's deck (no-op for existing cards). */
  addLessonVocab(userId: string, lessonNumber: number): number {
    const items = db
      .prepare(
        `SELECT v.id FROM vocab_items v JOIN lessons l ON l.id=v.lesson_id WHERE l.number=?`,
      )
      .all(lessonNumber) as { id: string }[];
    const ins = db.prepare(
      `INSERT OR IGNORE INTO srs_cards(id,user_id,vocab_item_id,interval_idx,due_at)
       VALUES(?,?,?,-1,datetime('now'))`,
    );
    let added = 0;
    for (const it of items) {
      const r = ins.run(randomUUID(), userId, it.id);
      added += Number(r.changes);
    }
    return added;
  },

  dueCards(userId: string, limit = 20): DueCard[] {
    return db
      .prepare(
        `SELECT c.id, v.fr, v.en, v.pron, v.example_fr as exampleFr, v.example_en as exampleEn,
                c.reps, c.lapses
         FROM srs_cards c JOIN vocab_items v ON v.id=c.vocab_item_id
         WHERE c.user_id=? AND c.due_at<=datetime('now')
         ORDER BY c.due_at LIMIT ?`,
      )
      .all(userId, limit) as DueCard[];
  },

  counts(userId: string): { due: number; total: number } {
    const due = db
      .prepare(`SELECT COUNT(*) c FROM srs_cards WHERE user_id=? AND due_at<=datetime('now')`)
      .get(userId) as { c: number };
    const total = db
      .prepare(`SELECT COUNT(*) c FROM srs_cards WHERE user_id=?`)
      .get(userId) as { c: number };
    return { due: due.c, total: total.c };
  },

  /** Applies a review grade. Returns false when the card isn't the user's. */
  review(userId: string, cardId: string, grade: SrsGrade): boolean {
    const card = db
      .prepare(`SELECT interval_idx, reps, lapses FROM srs_cards WHERE id=? AND user_id=?`)
      .get(cardId, userId) as { interval_idx: number; reps: number; lapses: number } | undefined;
    if (!card) return false;
    const next = scheduleSrs(
      { intervalIdx: card.interval_idx, reps: card.reps, lapses: card.lapses },
      grade,
    );
    db.prepare(`UPDATE srs_cards SET interval_idx=?, reps=?, lapses=?, due_at=? WHERE id=?`).run(
      next.intervalIdx,
      next.reps,
      next.lapses,
      next.dueAt.toISOString().replace("T", " ").slice(0, 19),
      cardId,
    );
    return true;
  },
};
