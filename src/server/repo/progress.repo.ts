import { db, uid } from "../db";
import type { Skill, QType } from "@/lib/engine/types";

export interface AnswerLog { qType: QType; skill: Skill; correct: boolean }

export const progressRepo = {
  completedNumbers(userId: string): number[] {
    return (db.prepare(`SELECT l.number FROM lesson_progress p JOIN lessons l ON l.id=p.lesson_id WHERE p.user_id=? ORDER BY l.number`)
      .all(userId) as { number: number }[]).map(r => r.number);
  },
  starsByNumber(userId: string): Record<number, number> {
    const rows = db.prepare(`SELECT l.number, p.stars FROM lesson_progress p JOIN lessons l ON l.id=p.lesson_id WHERE p.user_id=?`)
      .all(userId) as { number: number; stars: number }[];
    return Object.fromEntries(rows.map(r => [r.number, r.stars]));
  },
  upsertCompletion(userId: string, lessonNumber: number, stars: number, accuracy: number) {
    const lesson = db.prepare("SELECT id FROM lessons WHERE number=?").get(lessonNumber) as { id: string } | undefined;
    if (!lesson) throw new Error("lesson not found");
    const existing = db.prepare("SELECT id,stars,best_accuracy,attempts FROM lesson_progress WHERE user_id=? AND lesson_id=?")
      .get(userId, lesson.id) as { id: string; stars: number; best_accuracy: number; attempts: number } | undefined;
    if (existing) {
      db.prepare("UPDATE lesson_progress SET stars=MAX(stars,?), best_accuracy=MAX(best_accuracy,?), attempts=attempts+1, completed_at=datetime('now') WHERE id=?")
        .run(stars, accuracy, existing.id);
      return { firstClear: false };
    }
    db.prepare("INSERT INTO lesson_progress(id,user_id,lesson_id,stars,best_accuracy,attempts) VALUES(?,?,?,?,?,1)")
      .run(uid(), userId, lesson.id, stars, accuracy);
    return { firstClear: true };
  },
  logAnswers(userId: string, lessonNumber: number | null, answers: AnswerLog[]) {
    const ins = db.prepare("INSERT INTO attempts(id,user_id,lesson_number,q_type,skill,correct) VALUES(?,?,?,?,?,?)");
    db.exec("BEGIN");
    try { for (const a of answers) ins.run(uid(), userId, lessonNumber, a.qType, a.skill, a.correct ? 1 : 0); db.exec("COMMIT"); }
    catch (e) { db.exec("ROLLBACK"); throw e; }
  },
  skillAverages(userId: string): Record<Skill, { pct: number; n: number }> {
    const rows = db.prepare(`SELECT skill, COUNT(*) n, SUM(correct) c FROM attempts WHERE user_id=? GROUP BY skill`)
      .all(userId) as { skill: Skill; n: number; c: number }[];
    const base = { speaking: { pct: 0, n: 0 }, listening: { pct: 0, n: 0 }, reading: { pct: 0, n: 0 }, writing: { pct: 0, n: 0 }, vocab: { pct: 0, n: 0 }, grammar: { pct: 0, n: 0 } };
    for (const r of rows) base[r.skill] = { pct: Math.round((r.c / r.n) * 100), n: r.n };
    return base;
  },
  overallAccuracy(userId: string): { answered: number; correct: number } {
    const r = db.prepare("SELECT COUNT(*) a, COALESCE(SUM(correct),0) c FROM attempts WHERE user_id=?").get(userId) as { a: number; c: number };
    return { answered: r.a, correct: r.c };
  },
  bumpDailyStat(userId: string, date: string, add: { xp?: number; lessons?: number; correct?: number; answered?: number; minutes?: number }) {
    db.prepare(`INSERT INTO daily_stats(id,user_id,date,xp,lessons,correct,answered,minutes)
      VALUES(?,?,?,?,?,?,?,?)
      ON CONFLICT(user_id,date) DO UPDATE SET
        xp=xp+excluded.xp, lessons=lessons+excluded.lessons,
        correct=correct+excluded.correct, answered=answered+excluded.answered, minutes=minutes+excluded.minutes`)
      .run(uid(), userId, date, add.xp ?? 0, add.lessons ?? 0, add.correct ?? 0, add.answered ?? 0, add.minutes ?? 0);
  },
};
