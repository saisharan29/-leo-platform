import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/session";
import { curriculumRepo } from "@/server/repo/curriculum.repo";
import { progressRepo } from "@/server/repo/progress.repo";
import { unlockedThrough } from "@/lib/gamify";
import { generateExercises } from "@/lib/engine/exercises";

export async function GET(req: Request, { params }: { params: { number: string } }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: { code: "unauthorized", message: "Sign in required." } }, { status: 401 });
  const number = Number(params.number);
  if (!Number.isInteger(number) || number < 1 || number > 84)
    return NextResponse.json({ error: { code: "invalid_input", message: "Lesson number must be 1–84." } }, { status: 400 });
  const unlocked = unlockedThrough(progressRepo.completedNumbers(userId));
  if (number > unlocked)
    return NextResponse.json({ error: { code: "locked", message: `Finish lesson ${unlocked} first.` } }, { status: 403 });
  const lesson = curriculumRepo.lessonByNumber(number);
  if (!lesson) return NextResponse.json({ error: { code: "not_found", message: "Lesson not found." } }, { status: 404 });
  const url = new URL(req.url);
  const seed = Number(url.searchParams.get("seed")) || Math.floor(Math.random() * 1e9);
  return NextResponse.json({ seed, questions: generateExercises(lesson, seed) });
}
