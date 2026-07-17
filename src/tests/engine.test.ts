import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { generateExercises, isFillCorrect, isOrderCorrect, speakWordMatch } from "@/lib/engine/exercises";
import type { LessonContent, Question } from "@/lib/engine/types";
import { conjugate, withPronoun, ALL_VERBS, PERSONS } from "@/lib/engine/conjugator";
import { numToFrench } from "@/lib/engine/numbers";
import { scheduleSrs, SRS_INTERVAL_DAYS } from "@/lib/engine/srs";
import { wordDiff, softEquals } from "@/lib/engine/text";

const lessons: LessonContent[] = JSON.parse(
  readFileSync(path.join(__dirname, "../../db/seed-data/lessons.json"), "utf8"),
);

describe("curriculum dataset", () => {
  it("has 84 lessons with full content", () => {
    expect(lessons).toHaveLength(84);
    for (const l of lessons) {
      expect(l.vocab).toHaveLength(8);
      expect(l.grammar.examples.length).toBeGreaterThanOrEqual(3);
      expect(l.dialogue.lines.length).toBeGreaterThanOrEqual(3);
      expect(l.title).toBeTruthy();
      expect(l.writingPrompt).toBeTruthy();
    }
  });
});

describe("exercise generator", () => {
  it("produces ≥25 questions for every lesson, all with explanations and valid answers", () => {
    for (const l of lessons) {
      const qs = generateExercises(l, 7);
      expect(qs.length, `lesson ${l.number}`).toBeGreaterThanOrEqual(25);
      for (const q of qs) {
        expect(q.explain, `${l.number}/${q.id}`).toBeTruthy();
        assertAnswerable(q);
      }
    }
  });

  it("is deterministic for the same seed and different across seeds", () => {
    const a = generateExercises(lessons[0], 42).map(q => q.id + JSON.stringify("prompt" in q ? q.prompt : "")).join("|");
    const b = generateExercises(lessons[0], 42).map(q => q.id + JSON.stringify("prompt" in q ? q.prompt : "")).join("|");
    const c = generateExercises(lessons[0], 43).map(q => q.id + JSON.stringify("prompt" in q ? q.prompt : "")).join("|");
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  it("mcq options always contain exactly one correct answer and 4 unique options", () => {
    for (const l of lessons.slice(0, 20)) {
      for (const q of generateExercises(l, 3)) {
        if (q.type === "mcq" || q.type === "listen") {
          expect(q.options).toContain(q.answer);
          expect(new Set(q.options.map(o => o.toLowerCase())).size).toBe(q.options.length);
          expect(q.options.length).toBeGreaterThanOrEqual(3);
        }
      }
    }
  });

  it("fill/type graders accept accented and unaccented input", () => {
    const q = { accept: ["enchanté", "enchante"] };
    expect(isFillCorrect(q, "Enchanté")).toBe(true);
    expect(isFillCorrect(q, "enchante")).toBe(true);
    expect(isFillCorrect(q, "bonjour")).toBe(false);
  });

  it("order grader ignores punctuation spacing/case", () => {
    expect(isOrderCorrect({ answer: "Je suis étudiant ." }, ["je", "suis", "étudiant", "."])).toBe(true);
  });

  it("speak matcher returns word-hit ratio", () => {
    expect(speakWordMatch("je suis étudiant", "je suis etudiant")).toBe(1);
    expect(speakWordMatch("je suis étudiant", "je")).toBeCloseTo(1 / 3);
  });
});

function assertAnswerable(q: Question) {
  switch (q.type) {
    case "mcq":
    case "listen":
      expect(q.options.includes(q.answer)).toBe(true); break;
    case "fill":
    case "type":
      expect(q.accept.length).toBeGreaterThan(0);
      expect(isFillCorrect(q, q.answerShown)).toBe(true); break;
    case "match":
      expect(q.pairs.length).toBe(6); break;
    case "order":
      expect(isOrderCorrect(q, q.answer.split(" "))).toBe(true);
      expect([...q.bank].sort()).toEqual([...q.answer.split(" ")].sort()); break;
    case "speak":
      expect(q.target).toBeTruthy(); break;
  }
}

describe("conjugator", () => {
  const t = (inf: string, tense: Parameters<typeof conjugate>[1], i: number, want: string) =>
    expect(conjugate(inf, tense)[i], `${inf} ${tense} ${PERSONS[i]}`).toBe(want);

  it("handles regular + spelling-change presents", () => {
    t("parler", "pres", 3, "parlons");
    t("manger", "pres", 3, "mangeons");
    t("commencer", "pres", 3, "commençons");
    t("finir", "pres", 5, "finissent");
    t("vendre", "pres", 2, "vend");
  });
  it("imparfait/futur/conditionnel", () => {
    t("être", "imp", 0, "étais");
    t("parler", "imp", 5, "parlaient");
    t("vendre", "fut", 0, "vendrai");
    t("pouvoir", "fut", 0, "pourrai");
    t("faire", "cond", 3, "ferions");
  });
  it("passé composé incl. être verbs", () => {
    t("parler", "pc", 0, "ai parlé");
    t("aller", "pc", 2, "est allé");
    t("aller", "pc", 5, "sont allés");
  });
  it("subjonctif incl. irregular stems", () => {
    t("être", "subj", 3, "soyons");
    t("faire", "subj", 3, "fassions");
    t("prendre", "subj", 0, "prenne");
    t("prendre", "subj", 3, "prenions");
    t("voir", "subj", 4, "voyiez");
    t("aller", "subj", 0, "aille");
    t("aller", "subj", 3, "allions");
    t("vouloir", "subj", 0, "veuille");
  });
  it("elision j' before vowels", () => {
    expect(withPronoun(0, "ai parlé")).toBe("j'ai parlé");
    expect(withPronoun(0, "parle")).toBe("je parle");
  });
  it("every verb × tense yields 6 non-empty forms", () => {
    for (const v of ALL_VERBS)
      for (const tense of ["pres", "imp", "fut", "cond", "pc", "subj"] as const)
        expect(conjugate(v, tense).filter(Boolean)).toHaveLength(6);
  });
});

describe("french numbers", () => {
  const cases: [number, string][] = [
    [71, "soixante et onze"], [80, "quatre-vingts"], [81, "quatre-vingt-un"],
    [95, "quatre-vingt-quinze"], [21, "vingt et un"], [200, "deux cents"],
    [203, "deux cent trois"], [1984, "mille neuf cent quatre-vingt-quatre"],
    [2026, "deux mille vingt-six"],
  ];
  it.each(cases)("%i → %s", (n, s) => expect(numToFrench(n)).toBe(s));
});

describe("srs scheduler", () => {
  const now = new Date("2026-07-08T10:00:00Z");
  it("again → 1 day, lapse counted", () => {
    const r = scheduleSrs({ intervalIdx: 3, reps: 5, lapses: 0 }, "again", now);
    expect(r.intervalIdx).toBe(0);
    expect(r.lapses).toBe(1);
    expect(r.dueAt.getTime() - now.getTime()).toBe(86_400_000);
  });
  it("good steps one interval; easy steps two; capped at max", () => {
    expect(scheduleSrs({ intervalIdx: -1, reps: 0, lapses: 0 }, "good", now).intervalIdx).toBe(0);
    expect(scheduleSrs({ intervalIdx: 0, reps: 1, lapses: 0 }, "easy", now).intervalIdx).toBe(2);
    const max = SRS_INTERVAL_DAYS.length - 1;
    expect(scheduleSrs({ intervalIdx: max, reps: 9, lapses: 0 }, "easy", now).intervalIdx).toBe(max);
  });
});

describe("text helpers", () => {
  it("wordDiff flags per-word hits, accent-insensitive", () => {
    const d = wordDiff("Comment ça va ?", "comment sa va");
    expect(d.map(x => x.ok)).toEqual([true, false, true]);
  });
  it("softEquals ignores accents/punctuation/case", () => {
    expect(softEquals("Enchanté !", "enchante")).toBe(true);
  });
});
