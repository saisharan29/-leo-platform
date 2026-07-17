// Gamification rules — pure, tested via services tests.
export const LEVEL_XP = [0, 60, 150, 280, 460, 700, 1000, 1400, 1900, 2500, 3200, 4000, 5000, 6200, 7600, 9200, 11000, 13000, 15500, 18500];

export function levelFromXp(xp: number): { level: number; into: number; next: number } {
  let level = 1;
  for (let i = 0; i < LEVEL_XP.length; i++) if (xp >= LEVEL_XP[i]) level = i + 1;
  const cur = LEVEL_XP[level - 1];
  const next = LEVEL_XP[level] ?? cur + 3500;
  return { level, into: xp - cur, next: next - cur };
}

export function starsFor(accuracy: number): 0 | 1 | 2 | 3 {
  if (accuracy >= 95) return 3;
  if (accuracy >= 80) return 2;
  if (accuracy >= 60) return 1;
  return 0;
}

export function lessonRewards(accuracy: number, firstClear: boolean) {
  const xp = 20 + Math.round(accuracy / 5) + (firstClear ? 10 : 0);
  const coins = firstClear ? 15 : 6;
  const gems = accuracy >= 95 && firstClear ? 1 : 0;
  return { xp, coins, gems };
}

/** Paris-day streak: same day = keep, next day = +1, gap = reset to 1. */
export function nextStreak(lastStudyDate: string | null, todayParis: string, streak: number): number {
  if (!lastStudyDate) return 1;
  if (lastStudyDate === todayParis) return Math.max(streak, 1);
  const last = new Date(lastStudyDate + "T00:00:00Z").getTime();
  const today = new Date(todayParis + "T00:00:00Z").getTime();
  const diffDays = Math.round((today - last) / 86_400_000);
  return diffDays === 1 ? streak + 1 : 1;
}

export function parisToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** Lesson N is unlocked when N ≤ (highest completed)+1. */
export function unlockedThrough(completed: number[]): number {
  return (completed.length ? Math.max(...completed) : 0) + 1;
}
