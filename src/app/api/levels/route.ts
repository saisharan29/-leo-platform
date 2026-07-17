import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/session";
import { curriculumRepo } from "@/server/repo/curriculum.repo";
import { progressRepo } from "@/server/repo/progress.repo";
import { unlockedThrough } from "@/lib/gamify";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: { code: "unauthorized", message: "Sign in required." } }, { status: 401 });
  const stars = progressRepo.starsByNumber(userId);
  const unlocked = unlockedThrough(Object.keys(stars).map(Number));
  const modules = curriculumRepo.mapTree().map(m => ({
    ...m,
    lessons: m.lessons.map(l => ({
      ...l,
      stars: stars[l.number] ?? 0,
      done: l.number in stars,
      locked: l.number > unlocked,
      current: l.number === unlocked,
    })),
  }));
  return NextResponse.json({ modules, unlockedThrough: unlocked });
}
