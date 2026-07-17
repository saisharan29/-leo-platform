import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/lib/session";
import { curriculumRepo } from "@/server/repo/curriculum.repo";
import { progressRepo } from "@/server/repo/progress.repo";
import { generateExercises } from "@/lib/engine/exercises";
import {
  PLACEMENT_SAMPLE,
  placementStart,
  placementClears,
  type CefrLevel,
} from "@/lib/engine/placement";
import { unlockedThrough } from "@/lib/gamify";
import type { Question } from "@/lib/engine/types";

/** GET: 30 questions — 6 per CEFR level, sampled from 3 lessons per band. */
export async function GET() {
  const userId = await requireUserId();
  if (!userId)
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Sign in required." } },
      { status: 401 },
    );
  const perLevel = 6;
  const out: { level: CefrLevel; questions: Question[] }[] = [];
  for (const level of Object.keys(PLACEMENT_SAMPLE) as CefrLevel[]) {
    const pool: Question[] = [];
    for (const n of PLACEMENT_SAMPLE[level]) {
      const lesson = curriculumRepo.lessonByNumber(n);
      if (!lesson) continue;
      // Placement uses only auto-gradable selectable types.
      pool.push(
        ...generateExercises(lesson, 7 * n).filter(
          (q) => q.type === "mcq" || q.type === "listen",
        ),
      );
    }
    out.push({ level, questions: pool.slice(0, perLevel) });
  }
  return NextResponse.json({ sections: out });
}

const submitSchema = z.object({
  scores: z
    .array(
      z.object({
        level: z.enum(["A1", "A2", "B1", "B2", "C1"]),
        correct: z.number().int().min(0).max(20),
        answered: z.number().int().min(0).max(20),
      }),
    )
    .length(5),
});

/** POST: apply placement — mark all lessons before the start lesson as cleared. */
export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId)
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Sign in required." } },
      { status: 401 },
    );
  const body = await req.json().catch(() => null);
  const parsed = submitSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: { code: "invalid_input", message: parsed.error.issues[0].message } },
      { status: 400 },
    );

  const placement = placementStart(parsed.data.scores);
  // Never lock a user back below progress they already earned.
  const already = progressRepo.completedNumbers(userId);
  for (const n of placementClears(placement.startLesson)) {
    if (!already.includes(n)) progressRepo.upsertCompletion(userId, n, 0, 0);
  }
  const completed = progressRepo.completedNumbers(userId);
  return NextResponse.json({
    level: placement.level,
    startLesson: placement.startLesson,
    unlockedThrough: unlockedThrough(completed),
  });
}
