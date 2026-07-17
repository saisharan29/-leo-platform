import { beforeAll, describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const dir = mkdtempSync(path.join(tmpdir(), "leo-p5-"));
process.env.DATABASE_FILE = path.join(dir, "test.db");

let userId: string;

beforeAll(async () => {
  execSync(`node ${path.join(process.cwd(), "db", "seed.mjs")}`, { env: { ...process.env } });
  const { usersRepo } = await import("@/server/repo/users.repo");
  userId = usersRepo.create("p5@test.dev", "x".repeat(60), "P5 Fox");
});

describe("notes + bookmarks", () => {
  it("note upsert, read, list, delete-on-empty", async () => {
    const { contentRepo } = await import("@/server/repo/content.repo");
    contentRepo.upsertNote(userId, 3, "le/la matters!");
    expect(contentRepo.note(userId, 3)?.body).toBe("le/la matters!");
    contentRepo.upsertNote(userId, 3, "updated");
    expect(contentRepo.note(userId, 3)?.body).toBe("updated");
    expect(contentRepo.notes(userId)).toHaveLength(1);
    contentRepo.deleteNote(userId, 3);
    expect(contentRepo.note(userId, 3)).toBeUndefined();
  });

  it("bookmark toggles on and off", async () => {
    const { contentRepo } = await import("@/server/repo/content.repo");
    expect(contentRepo.toggleBookmark(userId, 5)).toBe(true);
    expect(contentRepo.bookmarks(userId)).toContain(5);
    expect(contentRepo.toggleBookmark(userId, 5)).toBe(false);
    expect(contentRepo.bookmarks(userId)).toHaveLength(0);
  });
});

describe("full-text search", () => {
  it("finds lessons and vocab; diacritics-insensitive", async () => {
    const { contentRepo } = await import("@/server/repo/content.repo");
    const hits = contentRepo.search("bonjour");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((h) => h.kind === "vocab")).toBe(true);
    // 'cafe' should match 'café' via remove_diacritics
    expect(contentRepo.search("cafe").length).toBeGreaterThan(0);
    // prefix matching for as-you-type
    expect(contentRepo.search("bonj").length).toBeGreaterThan(0);
  });

  it("never throws on hostile query strings", async () => {
    const { contentRepo } = await import("@/server/repo/content.repo");
    for (const q of ['"', "AND OR NOT", "*)(^", "   "]) {
      expect(() => contentRepo.search(q)).not.toThrow();
    }
  });

  it("admin edits reindex search", async () => {
    const { contentRepo } = await import("@/server/repo/content.repo");
    expect(contentRepo.search("zanzibar")).toHaveLength(0);
    contentRepo.updateLessonText(2, { title: "Zanzibar Special" });
    const hits = contentRepo.search("zanzibar");
    expect(hits.length).toBe(1);
    expect(hits[0].ref).toBe("2");
    // restore
    contentRepo.updateLessonText(2, { title: "The Alphabet & Pronunciation Rules" });
    expect(contentRepo.search("zanzibar")).toHaveLength(0);
  });

  it("vocab edit reindexes and lessonByNumber reflects it", async () => {
    const { contentRepo } = await import("@/server/repo/content.repo");
    const { curriculumRepo } = await import("@/server/repo/curriculum.repo");
    const before = curriculumRepo.lessonByNumber(1)!.vocab[0];
    contentRepo.updateVocab(1, 0, { en: "hello (edited)" });
    expect(curriculumRepo.lessonByNumber(1)!.vocab[0].en).toBe("hello (edited)");
    expect(contentRepo.search("edited").some((h) => h.ref === "1")).toBe(true);
    contentRepo.updateVocab(1, 0, { en: before.en });
  });
});

describe("roles + videos", () => {
  it("role defaults to user; setRole grants admin", async () => {
    const { contentRepo } = await import("@/server/repo/content.repo");
    expect(contentRepo.role(userId)).toBe("user");
    contentRepo.setRole(userId, "admin");
    expect(contentRepo.role(userId)).toBe("admin");
  });

  it("video add/list/delete", async () => {
    const { contentRepo } = await import("@/server/repo/content.repo");
    const id = contentRepo.addVideo(1, "Greetings with a real teacher", "abc123XYZ_-");
    expect(contentRepo.videos(1)).toHaveLength(1);
    expect(contentRepo.deleteVideo(id)).toBe(true);
    expect(contentRepo.videos(1)).toHaveLength(0);
    expect(contentRepo.deleteVideo("nope")).toBe(false);
  });
});
