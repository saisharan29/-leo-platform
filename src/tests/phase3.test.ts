import { beforeAll, describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

// temp DB before importing repos (same pattern as services.test.ts)
const dir = mkdtempSync(path.join(tmpdir(), "leo-p3-"));
process.env.DATABASE_FILE = path.join(dir, "test.db");

import {
  buildSystemPrompt,
  memoryBlock,
  AI_DAILY_QUOTA,
  type MemoryPack,
} from "@/lib/ai/prompts";

const MEM: MemoryPack = {
  displayName: "Testeur",
  cefr: "A2",
  lessonsDone: 12,
  weakSkills: [{ skill: "listening", pct: 61 }],
  weakWords: [{ fr: "le fromage", en: "cheese" }],
  streak: 4,
};

describe("tutor prompts", () => {
  it("every mode embeds the memory pack and the honesty policy", () => {
    for (const mode of ["chat", "roleplay", "writing", "interview"] as const) {
      const p = buildSystemPrompt(mode, MEM, "doctor");
      expect(p).toContain("Testeur");
      expect(p).toContain("le fromage");
      expect(p).toContain("listening 61%");
      expect(p).toContain("Never claim to score pronunciation");
      expect(p).toContain("Never complete the learner's graded exercises");
    }
  });
  it("roleplay prompt carries the scene", () => {
    expect(buildSystemPrompt("roleplay", MEM, "bank")).toContain("scene: bank");
  });
  it("writing prompt demands the structured review", () => {
    const p = buildSystemPrompt("writing", MEM);
    expect(p).toContain("/20");
    expect(p).toContain("wrote → fix");
  });
  it("memory block copes with empty data", () => {
    const b = memoryBlock({ ...MEM, weakSkills: [], weakWords: [] });
    expect(b).toContain("none flagged yet");
    expect(b).toContain("none yet");
  });
});

describe("memory pack + quota from real database", () => {
  let userId: string;

  beforeAll(async () => {
    execSync(`node ${path.join(process.cwd(), "db", "seed.mjs")}`, {
      env: { ...process.env },
    });
    const { usersRepo } = await import("@/server/repo/users.repo");
    userId = usersRepo.create("p3@test.dev", "x".repeat(60), "P3 Fox");
  });

  it("builds a pack reflecting real progress and lapsed cards", async () => {
    const { aiRepo } = await import("@/server/repo/ai.repo");
    const { progressRepo } = await import("@/server/repo/progress.repo");
    const { srsRepo } = await import("@/server/repo/srs.repo");
    const { db } = await import("@/server/db");

    progressRepo.upsertCompletion(userId, 1, 3, 95);
    // 10 wrong listening answers → weak skill
    progressRepo.logAnswers(
      userId,
      1,
      Array.from({ length: 10 }, () => ({ qType: "listen" as const, skill: "listening" as const, correct: false })),
    );
    srsRepo.addLessonVocab(userId, 1);
    // force a lapse on one card
    const card = db
      .prepare(`SELECT id FROM srs_cards WHERE user_id=? LIMIT 1`)
      .get(userId) as { id: string };
    db.prepare(`UPDATE srs_cards SET lapses=2 WHERE id=?`).run(card.id);

    const pack = aiRepo.memoryPack(userId);
    expect(pack.displayName).toBe("P3 Fox");
    expect(pack.cefr).toBe("A1");
    expect(pack.lessonsDone).toBe(1);
    expect(pack.weakSkills.some((s) => s.skill === "listening")).toBe(true);
    expect(pack.weakWords.length).toBeGreaterThan(0);
  });

  it("quota counts down and blocks at the limit", async () => {
    const { aiRepo } = await import("@/server/repo/ai.repo");
    const first = aiRepo.consumeQuota(userId, 3);
    expect(first).toBe(2);
    expect(aiRepo.consumeQuota(userId, 3)).toBe(1);
    expect(aiRepo.consumeQuota(userId, 3)).toBe(0);
    expect(aiRepo.consumeQuota(userId, 3)).toBe(-1); // blocked
    expect(AI_DAILY_QUOTA).toBeGreaterThan(10);
  });
});
