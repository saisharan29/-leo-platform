import { db } from "@/server/db";
import { usersRepo } from "@/server/repo/users.repo";
import { progressRepo } from "@/server/repo/progress.repo";
import { parisToday } from "@/lib/gamify";
import type { MemoryPack } from "@/lib/ai/prompts";

function cefrFromLessons(done: number[]): string {
  const max = done.length ? Math.max(...done) : 0;
  if (max >= 73) return "C1";
  if (max >= 61) return "B2";
  if (max >= 37) return "B1";
  if (max >= 23) return "A2";
  return "A1";
}

export const aiRepo = {
  /** Everything the tutor should remember about this learner, from real data. */
  memoryPack(userId: string): MemoryPack {
    const profile = usersRepo.profile(userId);
    const done = progressRepo.completedNumbers(userId);
    const skills = progressRepo.skillAverages(userId);
    const weakSkills = Object.entries(skills)
      .filter(([, v]) => v.n >= 5 && v.pct < 75)
      .map(([skill, v]) => ({ skill, pct: Math.round(v.pct) }))
      .sort((a, b) => a.pct - b.pct)
      .slice(0, 3);
    const weakWords = db
      .prepare(
        `SELECT v.fr, v.en FROM srs_cards c JOIN vocab_items v ON v.id=c.vocab_item_id
         WHERE c.user_id=? AND c.lapses >= 1
         ORDER BY c.lapses DESC, c.due_at ASC LIMIT 12`,
      )
      .all(userId) as { fr: string; en: string }[];
    return {
      displayName: profile?.display_name ?? "Learner",
      cefr: cefrFromLessons(done),
      lessonsDone: done.length,
      weakSkills,
      weakWords,
      streak: profile?.streak ?? 0,
    };
  },

  /** Returns remaining calls today after consuming one; -1 means quota exceeded. */
  consumeQuota(userId: string, quota: number): number {
    const today = parisToday();
    const row = db
      .prepare(`SELECT calls FROM ai_usage WHERE user_id=? AND date=?`)
      .get(userId, today) as { calls: number } | undefined;
    const used = row?.calls ?? 0;
    if (used >= quota) return -1;
    db.prepare(
      `INSERT INTO ai_usage(user_id, date, calls) VALUES(?,?,1)
       ON CONFLICT(user_id, date) DO UPDATE SET calls = calls + 1`,
    ).run(userId, today);
    return quota - used - 1;
  },
};
