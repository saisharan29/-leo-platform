import { describe, it, expect, beforeAll } from "vitest";
import { execSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { levelFromXp, starsFor, lessonRewards, nextStreak, unlockedThrough, parisToday } from "@/lib/gamify";

const tmp = mkdtempSync(path.join(tmpdir(), "leo-"));
process.env.DATABASE_FILE = path.join(tmp, "test.db");

beforeAll(() => {
  execSync(`node db/seed.mjs`, { cwd: process.cwd(), env: { ...process.env } });
});

describe("gamify rules", () => {
  it("levels are monotonic and start at 1", () => {
    expect(levelFromXp(0).level).toBe(1);
    expect(levelFromXp(60).level).toBe(2);
    expect(levelFromXp(999999).level).toBeGreaterThan(15);
  });
  it("stars thresholds", () => {
    expect(starsFor(100)).toBe(3);
    expect(starsFor(95)).toBe(3);
    expect(starsFor(80)).toBe(2);
    expect(starsFor(60)).toBe(1);
    expect(starsFor(59)).toBe(0);
  });
  it("rewards scale with accuracy and first clear", () => {
    const first = lessonRewards(100, true);
    const replay = lessonRewards(100, false);
    expect(first.xp).toBeGreaterThan(replay.xp);
    expect(first.gems).toBe(1);
    expect(replay.gems).toBe(0);
  });
  it("streak: same-day keeps, next-day increments, gap resets", () => {
    expect(nextStreak(null, "2026-07-08", 0)).toBe(1);
    expect(nextStreak("2026-07-08", "2026-07-08", 4)).toBe(4);
    expect(nextStreak("2026-07-07", "2026-07-08", 4)).toBe(5);
    expect(nextStreak("2026-07-05", "2026-07-08", 4)).toBe(1);
  });
  it("unlock rule: highest done + 1", () => {
    expect(unlockedThrough([])).toBe(1);
    expect(unlockedThrough([1, 2, 3])).toBe(4);
  });
  it("parisToday returns YYYY-MM-DD", () => {
    expect(parisToday(new Date("2026-07-08T12:00:00Z"))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("repositories (temp DB)", () => {
  it("seeded curriculum is complete and lesson fetch round-trips", async () => {
    const { curriculumRepo } = await import("@/server/repo/curriculum.repo");
    expect(curriculumRepo.totalLessons()).toBe(84);
    const tree = curriculumRepo.mapTree();
    expect(tree).toHaveLength(14);
    expect(tree.flatMap(m => m.lessons)).toHaveLength(84);
    const l1 = curriculumRepo.lessonByNumber(1)!;
    expect(l1.vocab).toHaveLength(8);
    expect(l1.grammar.examples.length).toBeGreaterThanOrEqual(3);
    expect(l1.dialogue.lines.length).toBeGreaterThanOrEqual(3);
  });

  it("user lifecycle: create → progress → stats → cascade delete", async () => {
    const { usersRepo } = await import("@/server/repo/users.repo");
    const { progressRepo } = await import("@/server/repo/progress.repo");
    const { db } = await import("@/server/db");

    const id = usersRepo.create("test@leo.fr", "hash", "Testeur");
    expect(usersRepo.findByEmail("test@leo.fr")?.id).toBe(id);
    expect(usersRepo.profile(id)?.display_name).toBe("Testeur");

    const { firstClear } = progressRepo.upsertCompletion(id, 1, 3, 96);
    expect(firstClear).toBe(true);
    expect(progressRepo.upsertCompletion(id, 1, 2, 80).firstClear).toBe(false);
    // best values kept
    const stars = progressRepo.starsByNumber(id);
    expect(stars[1]).toBe(3);

    progressRepo.logAnswers(id, 1, [
      { qType: "mcq", skill: "vocab", correct: true },
      { qType: "listen", skill: "listening", correct: false },
    ]);
    const skills = progressRepo.skillAverages(id);
    expect(skills.vocab.n).toBe(1);
    expect(skills.vocab.pct).toBe(100);
    expect(skills.listening.pct).toBe(0);
    expect(progressRepo.overallAccuracy(id)).toEqual({ answered: 2, correct: 1 });

    progressRepo.bumpDailyStat(id, "2026-07-08", { xp: 30, lessons: 1, correct: 1, answered: 2 });
    progressRepo.bumpDailyStat(id, "2026-07-08", { xp: 10 });
    const ds = db.prepare("SELECT xp, lessons FROM daily_stats WHERE user_id=? AND date=?").get(id, "2026-07-08") as { xp: number; lessons: number };
    expect(ds).toEqual({ xp: 40, lessons: 1 });

    usersRepo.deleteUser(id);
    expect(usersRepo.findByEmail("test@leo.fr")).toBeUndefined();
    const orphan = db.prepare("SELECT COUNT(*) c FROM attempts WHERE user_id=?").get(id) as { c: number };
    expect(orphan.c).toBe(0); // cascade verified
  });
});
