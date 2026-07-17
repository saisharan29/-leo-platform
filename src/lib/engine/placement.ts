// Placement test logic. Pure and unit-tested; the API applies the result.

export type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1";

export const LEVEL_START: Record<CefrLevel, number> = {
  A1: 1,
  A2: 23,
  B1: 37,
  B2: 61,
  C1: 73,
};

/** Lessons sampled per level for placement questions (spread across the band). */
export const PLACEMENT_SAMPLE: Record<CefrLevel, number[]> = {
  A1: [2, 8, 15],
  A2: [24, 29, 34],
  B1: [38, 47, 56],
  B2: [62, 66, 71],
  C1: [74, 78, 83],
};

export interface LevelScore {
  level: CefrLevel;
  correct: number;
  answered: number;
}

/**
 * A level is "passed" at ≥70% with at least 4 answers. The start level is the
 * first FAILED level (you begin where you stopped passing); passing everything
 * places you at C1's start — the course still has value at the top band.
 */
export function placementStart(scores: LevelScore[]): { level: CefrLevel; startLesson: number } {
  const order: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1"];
  const byLevel = new Map(scores.map((s) => [s.level, s]));
  for (const level of order) {
    const s = byLevel.get(level);
    const passed = !!s && s.answered >= 4 && s.correct / s.answered >= 0.7;
    if (!passed) return { level, startLesson: LEVEL_START[level] };
  }
  return { level: "C1", startLesson: LEVEL_START.C1 };
}

/** Lesson numbers that placement marks as cleared (everything before start). */
export function placementClears(startLesson: number): number[] {
  const out: number[] = [];
  for (let n = 1; n < startLesson; n++) out.push(n);
  return out;
}
