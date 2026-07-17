// Spaced-repetition scheduling. Pure function of (card, grade, now).
export const SRS_INTERVAL_DAYS = [1, 3, 7, 14, 30, 60] as const;
export type SrsGrade = "again" | "good" | "easy";

export interface SrsState { intervalIdx: number; reps: number; lapses: number }
export interface SrsResult extends SrsState { dueAt: Date }

const DAY = 86_400_000;

export function scheduleSrs(state: SrsState, grade: SrsGrade, now: Date = new Date()): SrsResult {
  if (grade === "again") {
    return { intervalIdx: 0, reps: state.reps + 1, lapses: state.lapses + 1, dueAt: new Date(now.getTime() + DAY) };
  }
  const step = grade === "easy" ? 2 : 1;
  const intervalIdx = Math.min(Math.max(state.intervalIdx, -1) + step, SRS_INTERVAL_DAYS.length - 1);
  return {
    intervalIdx,
    reps: state.reps + 1,
    lapses: state.lapses,
    dueAt: new Date(now.getTime() + SRS_INTERVAL_DAYS[intervalIdx] * DAY),
  };
}
