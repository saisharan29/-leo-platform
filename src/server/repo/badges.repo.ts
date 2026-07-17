import { db } from "@/server/db";
import { qualifiedBadges, type BadgeContext } from "@/lib/badges";

export interface BadgeRow {
  code: string;
  title: string;
  emoji: string;
  rule: string;
  earned_at: string | null;
}

export const badgesRepo = {
  all(userId: string): BadgeRow[] {
    return db
      .prepare(
        `SELECT b.code, b.title, b.emoji, b.rule, ub.earned_at
         FROM badge_defs b
         LEFT JOIN user_badges ub ON ub.badge_id=b.id AND ub.user_id=?
         ORDER BY b.rowid`,
      )
      .all(userId) as BadgeRow[];
  },

  /** Awards any newly-qualified badges. Returns the codes awarded just now. */
  awardQualified(userId: string, ctx: BadgeContext): { code: string; title: string; emoji: string }[] {
    const codes = qualifiedBadges(ctx);
    if (codes.length === 0) return [];
    const placeholders = codes.map(() => "?").join(",");
    const fresh = db
      .prepare(
        `SELECT id, code, title, emoji FROM badge_defs
         WHERE code IN (${placeholders})
           AND id NOT IN (SELECT badge_id FROM user_badges WHERE user_id=?)`,
      )
      .all(...codes, userId) as { id: string; code: string; title: string; emoji: string }[];
    const ins = db.prepare(`INSERT OR IGNORE INTO user_badges(user_id,badge_id) VALUES(?,?)`);
    for (const b of fresh) ins.run(userId, b.id);
    return fresh.map(({ code, title, emoji }) => ({ code, title, emoji }));
  },
};
