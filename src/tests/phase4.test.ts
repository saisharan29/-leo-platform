import { beforeAll, describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const dir = mkdtempSync(path.join(tmpdir(), "leo-p4-"));
process.env.DATABASE_FILE = path.join(dir, "test.db");

import { generatePlan } from "@/lib/engine/planner";

describe("planner engine", () => {
  const base = {
    nextLessonNumber: 5 as number | null,
    nextLessonTitle: "Nouns" as string | null,
    dueReviews: 0,
    weakSkills: [] as { skill: string; pct: number }[],
    dailyGoalXp: 50,
    streak: 3,
  };

  it("reviews come first when due, at priority 1", () => {
    const plan = generatePlan({ ...base, dueReviews: 10 });
    expect(plan[0].kind).toBe("review");
    expect(plan[0].priority).toBe(1);
    expect(plan[0].title).toContain("10");
  });

  it("no review task when nothing is due; lesson anchors the day", () => {
    const plan = generatePlan(base);
    expect(plan.some((t) => t.kind === "review")).toBe(false);
    expect(plan[0].kind).toBe("lesson");
    expect(plan[0].title).toContain("Lesson 5");
  });

  it("weak skills map to the right practice tools, max 2", () => {
    const plan = generatePlan({
      ...base,
      weakSkills: [
        { skill: "listening", pct: 55 },
        { skill: "grammar", pct: 60 },
        { skill: "vocab", pct: 65 },
      ],
    });
    expect(plan.some((t) => t.kind === "dictation")).toBe(true);
    expect(plan.some((t) => t.kind === "conjugation")).toBe(true);
    // third weak skill dropped (max 2)
    const practiceCount = plan.filter((t) => !["lesson", "review", "arcade"].includes(t.kind)).length;
    expect(practiceCount).toBeLessThanOrEqual(2);
  });

  it("pads toward the XP goal with one arcade task, never more than 5 tasks", () => {
    const plan = generatePlan({ ...base, dailyGoalXp: 120, dueReviews: 8 });
    expect(plan.some((t) => t.kind === "arcade")).toBe(true);
    expect(plan.length).toBeLessThanOrEqual(5);
  });

  it("finished course → no lesson task", () => {
    const plan = generatePlan({ ...base, nextLessonNumber: null, nextLessonTitle: null });
    expect(plan.some((t) => t.kind === "lesson")).toBe(false);
  });
});

describe("plan repo + reports on a real database", () => {
  let userId: string;

  beforeAll(async () => {
    execSync(`node ${path.join(process.cwd(), "db", "seed.mjs")}`, { env: { ...process.env } });
    const { usersRepo } = await import("@/server/repo/users.repo");
    userId = usersRepo.create("p4@test.dev", "x".repeat(60), "P4 Fox");
  });

  it("ensureDay generates once and is idempotent", async () => {
    const { planRepo } = await import("@/server/repo/plan.repo");
    const first = planRepo.ensureDay(userId, "2026-07-12");
    expect(first.length).toBeGreaterThan(0);
    expect(first[0].status).toBe("todo");
    const second = planRepo.ensureDay(userId, "2026-07-12");
    expect(second.map((t) => t.id)).toEqual(first.map((t) => t.id));
  });

  it("status updates persist; foreign task ids are rejected", async () => {
    const { planRepo } = await import("@/server/repo/plan.repo");
    const tasks = planRepo.byDate(userId, "2026-07-12");
    expect(planRepo.setStatus(userId, tasks[0].id, "done")).toBe(true);
    expect(planRepo.byDate(userId, "2026-07-12")[0].status).toBe("done");
    expect(planRepo.setStatus(userId, "nonexistent-id", "done")).toBe(false);
  });

  it("sweepMissed flips only past todo/doing tasks", async () => {
    const { planRepo } = await import("@/server/repo/plan.repo");
    planRepo.ensureDay(userId, "2026-07-10"); // past day plan
    const changed = planRepo.sweepMissed(userId, "2026-07-12");
    expect(changed).toBeGreaterThan(0);
    const past = planRepo.byDate(userId, "2026-07-10");
    expect(past.every((t) => t.status === "missed")).toBe(true);
    // today's 'done' untouched
    expect(planRepo.byDate(userId, "2026-07-12")[0].status).toBe("done");
  });

  it("month view aggregates day statuses", async () => {
    const { planRepo } = await import("@/server/repo/plan.repo");
    const days = planRepo.month(userId, "2026-07");
    const d12 = days.find((d) => d.date === "2026-07-12");
    const d10 = days.find((d) => d.date === "2026-07-10");
    expect(d12?.done).toBeGreaterThanOrEqual(1);
    expect(d10?.missed).toBe(d10?.total);
  });

  it("report aggregates daily stats + per-skill attempts in range", async () => {
    const { planRepo } = await import("@/server/repo/plan.repo");
    const { progressRepo } = await import("@/server/repo/progress.repo");
    // Dynamic window: attempts are stamped with the real current date, so the
    // report range must include "today" wherever/whenever the suite runs.
    const today = new Date().toISOString().slice(0, 10);
    const weekAgo = new Date(Date.now() - 6 * 86_400_000).toISOString().slice(0, 10);
    progressRepo.bumpDailyStat(userId, today, { xp: 40, lessons: 1, correct: 9, answered: 10 });
    progressRepo.logAnswers(userId, 1, [
      { qType: "mcq", skill: "vocab", correct: true },
      { qType: "mcq", skill: "vocab", correct: false },
    ]);
    const rep = planRepo.report(userId, weekAgo, today);
    expect(rep.totals.xp).toBeGreaterThanOrEqual(40);
    expect(rep.totals.lessons).toBeGreaterThanOrEqual(1);
    expect(rep.skills.find((s) => s.skill === "vocab")?.n).toBe(2);
    expect(rep.activeDays).toBeGreaterThanOrEqual(1);
  });

  it("leaderboard only shows opted-in learners", async () => {
    const { planRepo } = await import("@/server/repo/plan.repo");
    const { usersRepo } = await import("@/server/repo/users.repo");
    const { progressRepo } = await import("@/server/repo/progress.repo");
    const today = new Date().toISOString().slice(0, 10);
    const weekAgo = new Date(Date.now() - 6 * 86_400_000).toISOString().slice(0, 10);
    expect(planRepo.leaderboard(weekAgo, today).some((e) => e.name === "P4 Fox")).toBe(false);
    usersRepo.updateProfile(userId, { leaderboard_opt_in: 1 });
    progressRepo.bumpDailyStat(userId, today, { xp: 25 });
    const board = planRepo.leaderboard(weekAgo, today);
    const me = board.find((e) => e.name === "P4 Fox");
    expect(me).toBeDefined();
    expect(me!.xp).toBeGreaterThanOrEqual(65);
  });
});
