import { beforeAll, describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { qualifiedBadges } from "@/lib/badges";
import { placementStart, placementClears, LEVEL_START } from "@/lib/engine/placement";

const dir = mkdtempSync(join(tmpdir(), "leo-p2-"));
process.env.DATABASE_FILE = join(dir, "test.db");

describe("badges engine", () => {
  it("awards nothing to a fresh user", () => {
    expect(
      qualifiedBadges({ completedNumbers: [], starsByNumber: {}, streak: 0, coins: 0 }),
    ).toEqual([]);
  });

  it("awards first + perfect + coins together", () => {
    const codes = qualifiedBadges({
      completedNumbers: [1],
      starsByNumber: { 1: 3 },
      streak: 1,
      coins: 520,
    });
    expect(codes).toContain("first");
    expect(codes).toContain("perfect");
    expect(codes).toContain("coins500");
    expect(codes).not.toContain("streak7");
  });

  it("level badges require the whole band", () => {
    const almostA1 = Array.from({ length: 21 }, (_, i) => i + 1); // 1..21, missing 22
    expect(
      qualifiedBadges({ completedNumbers: almostA1, starsByNumber: {}, streak: 0, coins: 0 }),
    ).not.toContain("a1");
    const fullA1 = [...almostA1, 22];
    expect(
      qualifiedBadges({ completedNumbers: fullA1, starsByNumber: {}, streak: 0, coins: 0 }),
    ).toContain("a1");
  });

  it("streak and volume thresholds", () => {
    const codes = qualifiedBadges({
      completedNumbers: Array.from({ length: 42 }, (_, i) => i + 1),
      starsByNumber: {},
      streak: 30,
      coins: 0,
    });
    for (const c of ["streak7", "streak30", "l10", "l42", "a1", "a2"]) expect(codes).toContain(c);
    expect(codes).not.toContain("b1"); // 37..60 not all done (only up to 42)
  });
});

describe("placement engine", () => {
  const s = (level: "A1" | "A2" | "B1" | "B2" | "C1", correct: number, answered = 6) => ({
    level,
    correct,
    answered,
  });

  it("total beginner starts at lesson 1", () => {
    const r = placementStart([s("A1", 1), s("A2", 0), s("B1", 0), s("B2", 0), s("C1", 0)]);
    expect(r).toEqual({ level: "A1", startLesson: 1 });
  });

  it("passing A1+A2 starts at B1", () => {
    const r = placementStart([s("A1", 6), s("A2", 5), s("B1", 2), s("B2", 1), s("C1", 0)]);
    expect(r).toEqual({ level: "B1", startLesson: LEVEL_START.B1 });
  });

  it("acing everything starts at C1, never beyond", () => {
    const r = placementStart([s("A1", 6), s("A2", 6), s("B1", 6), s("B2", 6), s("C1", 6)]);
    expect(r).toEqual({ level: "C1", startLesson: 73 });
  });

  it("a skipped level (too few answers) stops progression", () => {
    const r = placementStart([s("A1", 6), s("A2", 2, 2), s("B1", 6), s("B2", 6), s("C1", 6)]);
    expect(r.level).toBe("A2");
  });

  it("placementClears returns exactly the lessons below start", () => {
    expect(placementClears(1)).toEqual([]);
    expect(placementClears(37)).toHaveLength(36);
    expect(placementClears(37)[35]).toBe(36);
  });
});

describe("srs repo (real temp db)", () => {
  let userId: string;

  beforeAll(async () => {
    // env passed via options (not inline prefix) so it works on Windows too
    execSync("node db/seed.mjs", {
      cwd: process.cwd(),
      stdio: "pipe",
      env: { ...process.env },
    });
    const { usersRepo } = await import("@/server/repo/users.repo");
    userId = usersRepo.create("srs@test.dev", "x".repeat(60), "SRS Tester");
  });

  it("adds a lesson's 8 vocab items once, idempotently", async () => {
    const { srsRepo } = await import("@/server/repo/srs.repo");
    expect(srsRepo.addLessonVocab(userId, 1)).toBe(8);
    expect(srsRepo.addLessonVocab(userId, 1)).toBe(0);
    expect(srsRepo.counts(userId)).toEqual({ due: 8, total: 8 });
  });

  it("new cards are due immediately and carry vocab fields", async () => {
    const { srsRepo } = await import("@/server/repo/srs.repo");
    const due = srsRepo.dueCards(userId);
    expect(due).toHaveLength(8);
    expect(due[0].fr.length).toBeGreaterThan(0);
    expect(due[0].en.length).toBeGreaterThan(0);
  });

  it("'good' review pushes the card out of the due queue", async () => {
    const { srsRepo } = await import("@/server/repo/srs.repo");
    const [card] = srsRepo.dueCards(userId, 1);
    expect(srsRepo.review(userId, card.id, "good")).toBe(true);
    expect(srsRepo.counts(userId).due).toBe(7);
  });

  it("rejects reviews of another user's card", async () => {
    const { srsRepo } = await import("@/server/repo/srs.repo");
    const { usersRepo } = await import("@/server/repo/users.repo");
    const other = usersRepo.create("other@test.dev", "x".repeat(60), "Other");
    const [card] = srsRepo.dueCards(userId, 1);
    expect(srsRepo.review(other, card.id, "good")).toBe(false);
  });

  it("badge award is idempotent through the repo", async () => {
    const { badgesRepo } = await import("@/server/repo/badges.repo");
    const ctx = { completedNumbers: [1], starsByNumber: { 1: 3 }, streak: 0, coins: 0 };
    const first = badgesRepo.awardQualified(userId, ctx);
    expect(first.map((b) => b.code).sort()).toEqual(["first", "perfect"]);
    expect(badgesRepo.awardQualified(userId, ctx)).toEqual([]);
    const all = badgesRepo.all(userId);
    expect(all.filter((b) => b.earned_at).length).toBe(2);
    expect(all.length).toBe(12);
  });
});
