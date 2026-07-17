import { db, uid } from "../db";

export interface UserRow { id: string; email: string; password_hash: string }
export interface ProfileRow {
  user_id: string; display_name: string; avatar: string; daily_goal_xp: number;
  theme: string; tz: string; xp: number; coins: number; gems: number;
  streak: number; streak_best: number; last_study_date: string | null;
}

export const usersRepo = {
  findByEmail(email: string): UserRow | undefined {
    return db.prepare("SELECT id,email,password_hash FROM users WHERE email=?").get(email) as UserRow | undefined;
  },
  findById(id: string): UserRow | undefined {
    return db.prepare("SELECT id,email,password_hash FROM users WHERE id=?").get(id) as UserRow | undefined;
  },
  create(email: string, passwordHash: string, displayName: string): string {
    const id = uid();
    db.exec("BEGIN");
    try {
      db.prepare("INSERT INTO users(id,email,password_hash) VALUES(?,?,?)").run(id, email, passwordHash);
      db.prepare("INSERT INTO profiles(user_id,display_name) VALUES(?,?)").run(id, displayName);
      db.exec("COMMIT");
    } catch (e) { db.exec("ROLLBACK"); throw e; }
    return id;
  },
  profile(userId: string): ProfileRow | undefined {
    return db.prepare("SELECT * FROM profiles WHERE user_id=?").get(userId) as ProfileRow | undefined;
  },
  updateProfile(userId: string, patch: Partial<Pick<ProfileRow, "display_name" | "avatar" | "daily_goal_xp" | "theme">> & { leaderboard_opt_in?: number }) {
    const sets: string[] = []; const vals: unknown[] = [];
    for (const [k, v] of Object.entries(patch)) { sets.push(`${k}=?`); vals.push(v); }
    if (!sets.length) return;
    db.prepare(`UPDATE profiles SET ${sets.join(",")} WHERE user_id=?`).run(...(vals as never[]), userId);
  },
  deleteUser(userId: string) {
    db.prepare("DELETE FROM users WHERE id=?").run(userId); // cascades
  },
};
