import { db, uid } from "@/server/db";
import { usersRepo } from "@/server/repo/users.repo";
import { progressRepo } from "@/server/repo/progress.repo";
import { curriculumRepo } from "@/server/repo/curriculum.repo";
import { srsRepo } from "@/server/repo/srs.repo";
import { unlockedThrough, parisToday } from "@/lib/gamify";
import { generatePlan } from "@/lib/engine/planner";

export interface PlanTaskRow {
  id: string;
  date: string;
  kind: string;
  title: string;
  minutes: number;
  xp: number;
  priority: number;
  status: string;
  sort: number;
}

const STATUSES = ["todo", "doing", "done", "missed", "moved"] as const;
export type TaskStatus = (typeof STATUSES)[number];
export const isTaskStatus = (s: string): s is TaskStatus =>
  (STATUSES as readonly string[]).includes(s);

export const planRepo = {
  /** Idempotent: generates today's plan on first call, returns it after. */
  ensureDay(userId: string, date: string): PlanTaskRow[] {
    const existing = this.byDate(userId, date);
    if (existing.length > 0) return existing;

    const profile = usersRepo.profile(userId);
    const completed = progressRepo.completedNumbers(userId);
    const placement = (profile as unknown as { placement_unlock?: number })?.placement_unlock ?? 1;
    const nextN = Math.max(unlockedThrough(completed), placement);
    const total = curriculumRepo.totalLessons();
    const nextLesson = nextN <= total ? curriculumRepo.lessonByNumber(nextN) : undefined;
    const skills = progressRepo.skillAverages(userId);
    const weakSkills = Object.entries(skills)
      .filter(([, v]) => v.n >= 5 && v.pct < 75)
      .map(([skill, v]) => ({ skill, pct: v.pct }))
      .sort((a, b) => a.pct - b.pct);

    const tasks = generatePlan({
      nextLessonNumber: nextLesson?.number ?? null,
      nextLessonTitle: nextLesson?.title ?? null,
      dueReviews: srsRepo.counts(userId).due,
      weakSkills,
      dailyGoalXp: profile?.daily_goal_xp ?? 50,
      streak: profile?.streak ?? 0,
    });

    const ins = db.prepare(
      `INSERT INTO plan_tasks(id,user_id,date,kind,title,minutes,xp,priority,status,sort)
       VALUES(?,?,?,?,?,?,?,?, 'todo', ?)
       ON CONFLICT(user_id,date,kind) DO NOTHING`,
    );
    for (const t of tasks) ins.run(uid(), userId, date, t.kind, t.title, t.minutes, t.xp, t.priority, t.sort);
    return this.byDate(userId, date);
  },

  byDate(userId: string, date: string): PlanTaskRow[] {
    return db
      .prepare(
        `SELECT id,date,kind,title,minutes,xp,priority,status,sort
         FROM plan_tasks WHERE user_id=? AND date=? ORDER BY sort`,
      )
      .all(userId, date) as PlanTaskRow[];
  },

  setStatus(userId: string, taskId: string, status: TaskStatus): boolean {
    const r = db
      .prepare(`UPDATE plan_tasks SET status=? WHERE id=? AND user_id=?`)
      .run(status, taskId, userId);
    return Number(r.changes) > 0;
  },

  /** Any past-day 'todo'/'doing' task becomes 'missed'. Returns rows changed. */
  sweepMissed(userId: string, today: string): number {
    const r = db
      .prepare(
        `UPDATE plan_tasks SET status='missed'
         WHERE user_id=? AND date < ? AND status IN ('todo','doing')`,
      )
      .run(userId, today);
    return Number(r.changes);
  },

  /** Month view: tasks per day with done counts, for YYYY-MM. */
  month(userId: string, ym: string): { date: string; total: number; done: number; missed: number }[] {
    return db
      .prepare(
        `SELECT date, COUNT(*) as total,
                SUM(CASE WHEN status='done' THEN 1 ELSE 0 END) as done,
                SUM(CASE WHEN status='missed' THEN 1 ELSE 0 END) as missed
         FROM plan_tasks WHERE user_id=? AND date LIKE ? GROUP BY date ORDER BY date`,
      )
      .all(userId, `${ym}-%`) as { date: string; total: number; done: number; missed: number }[];
  },

  /** GitHub-style heatmap: xp+lessons per day for a year. */
  heatmap(userId: string, year: string): { date: string; xp: number; lessons: number }[] {
    return db
      .prepare(
        `SELECT date, xp, lessons FROM daily_stats WHERE user_id=? AND date LIKE ? ORDER BY date`,
      )
      .all(userId, `${year}-%`) as { date: string; xp: number; lessons: number }[];
  },

  /** Aggregates for weekly/monthly reports. from/to inclusive (YYYY-MM-DD). */
  report(userId: string, from: string, to: string) {
    const days = db
      .prepare(
        `SELECT date, xp, minutes, lessons, correct, answered
         FROM daily_stats WHERE user_id=? AND date BETWEEN ? AND ? ORDER BY date`,
      )
      .all(userId, from, to) as {
      date: string; xp: number; minutes: number; lessons: number; correct: number; answered: number;
    }[];
    const skillRows = db
      .prepare(
        `SELECT skill,
                SUM(correct) as correct, COUNT(*) as answered
         FROM attempts WHERE user_id=? AND date(created_at) BETWEEN ? AND ?
         GROUP BY skill`,
      )
      .all(userId, from, to) as { skill: string; correct: number; answered: number }[];
    const totals = days.reduce(
      (a, d) => ({
        xp: a.xp + d.xp, minutes: a.minutes + d.minutes, lessons: a.lessons + d.lessons,
        correct: a.correct + d.correct, answered: a.answered + d.answered,
      }),
      { xp: 0, minutes: 0, lessons: 0, correct: 0, answered: 0 },
    );
    const skills = skillRows.map((s) => ({
      skill: s.skill,
      pct: s.answered ? Math.round((s.correct / s.answered) * 100) : 0,
      n: s.answered,
    }));
    const active = days.filter((d) => d.answered > 0 || d.lessons > 0).length;
    return { days, totals, skills, activeDays: active };
  },

  /** Weekly XP leaderboard among opted-in learners. */
  leaderboard(from: string, to: string, limit = 20) {
    return db
      .prepare(
        `SELECT p.display_name as name, p.avatar, SUM(d.xp) as xp
         FROM daily_stats d JOIN profiles p ON p.user_id=d.user_id
         WHERE p.leaderboard_opt_in=1 AND d.date BETWEEN ? AND ?
         GROUP BY d.user_id ORDER BY xp DESC LIMIT ?`,
      )
      .all(from, to, limit) as { name: string; avatar: string; xp: number }[];
  },
};
