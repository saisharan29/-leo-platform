// Badge rule evaluation. Pure function of user progress → earned badge codes.
// Codes must match db/seed.mjs BADGES.

export interface BadgeContext {
  completedNumbers: number[];
  starsByNumber: Record<number, number>;
  streak: number;
  coins: number;
}

export const LEVEL_RANGES: Record<string, [number, number]> = {
  a1: [1, 22],
  a2: [23, 36],
  b1: [37, 60],
  b2: [61, 72],
  c1: [73, 84],
};

function rangeDone(done: Set<number>, [from, to]: [number, number]): boolean {
  for (let n = from; n <= to; n++) if (!done.has(n)) return false;
  return true;
}

/** Returns every badge code the user currently qualifies for. */
export function qualifiedBadges(ctx: BadgeContext): string[] {
  const done = new Set(ctx.completedNumbers);
  const out: string[] = [];
  if (done.has(1)) out.push("first");
  if (ctx.streak >= 7) out.push("streak7");
  if (ctx.streak >= 30) out.push("streak30");
  if (done.size >= 10) out.push("l10");
  if (done.size >= 42) out.push("l42");
  for (const code of ["a1", "a2", "b1", "b2", "c1"] as const) {
    if (rangeDone(done, LEVEL_RANGES[code])) out.push(code);
  }
  if (Object.values(ctx.starsByNumber).some((s) => s >= 3)) out.push("perfect");
  if (ctx.coins >= 500) out.push("coins500");
  return out;
}
