// Daily study plan generator. Pure function of learner state — unit tested.
export interface PlannerInput {
  nextLessonNumber: number | null; // null = course finished
  nextLessonTitle: string | null;
  dueReviews: number;
  weakSkills: { skill: string; pct: number }[]; // worst first
  dailyGoalXp: number;
  streak: number;
}

export interface PlanTask {
  kind: "lesson" | "review" | "dictation" | "conjugation" | "numbers" | "arcade";
  title: string;
  minutes: number;
  xp: number;
  priority: 1 | 2 | 3;
  sort: number;
}

const SKILL_TASK: Record<string, { kind: PlanTask["kind"]; title: string }> = {
  listening: { kind: "dictation", title: "Dictation — sharpen your listening" },
  writing: { kind: "dictation", title: "Dictation — spelling under pressure" },
  grammar: { kind: "conjugation", title: "Conjugation drill — weak grammar" },
  vocab: { kind: "arcade", title: "Arcade round — vocab reps" },
  reading: { kind: "arcade", title: "Speed quiz — reading pace" },
  speaking: { kind: "numbers", title: "Numbers dash — say them aloud too" },
};

/**
 * Rules:
 * 1. Due SRS reviews always come first (highest priority) — never let words rot.
 * 2. The next lesson is the day's anchor if the course isn't finished.
 * 3. One targeted practice task per weak skill (max 2), mapped to the right tool.
 * 4. A light arcade task pads the plan up to the XP goal, never past 5 tasks.
 */
export function generatePlan(input: PlannerInput): PlanTask[] {
  const tasks: PlanTask[] = [];
  let sort = 0;

  if (input.dueReviews > 0) {
    tasks.push({
      kind: "review",
      title: `Review ${input.dueReviews} due word${input.dueReviews === 1 ? "" : "s"}`,
      minutes: Math.min(15, Math.max(3, Math.ceil(input.dueReviews * 0.5))),
      xp: Math.min(30, input.dueReviews * 2),
      priority: 1,
      sort: sort++,
    });
  }

  if (input.nextLessonNumber !== null) {
    tasks.push({
      kind: "lesson",
      title: `Lesson ${input.nextLessonNumber} · ${input.nextLessonTitle ?? ""}`.trim(),
      minutes: 15,
      xp: 40,
      priority: 1,
      sort: sort++,
    });
  }

  const seen = new Set<PlanTask["kind"]>(tasks.map((t) => t.kind));
  for (const ws of input.weakSkills.slice(0, 2)) {
    const map = SKILL_TASK[ws.skill];
    if (!map || seen.has(map.kind)) continue;
    seen.add(map.kind);
    tasks.push({ kind: map.kind, title: map.title, minutes: 8, xp: 15, priority: 2, sort: sort++ });
  }

  const plannedXp = tasks.reduce((a, t) => a + t.xp, 0);
  if (plannedXp < input.dailyGoalXp && tasks.length < 5 && !seen.has("arcade")) {
    tasks.push({
      kind: "arcade",
      title: "Arcade round — keep it fun",
      minutes: 5,
      xp: Math.max(10, input.dailyGoalXp - plannedXp),
      priority: 3,
      sort: sort++,
    });
  }

  return tasks;
}
