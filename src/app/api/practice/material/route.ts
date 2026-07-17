import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/session";
import { progressRepo } from "@/server/repo/progress.repo";
import { unlockedThrough } from "@/lib/gamify";
import { db } from "@/server/db";

export async function GET() {
  const userId = await requireUserId();
  if (!userId)
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Sign in required." } },
      { status: 401 },
    );
  // Material comes from everything the user has reached (completed + current lesson).
  const upto = unlockedThrough(progressRepo.completedNumbers(userId));
  const items = db
    .prepare(
      `SELECT v.fr, v.en, v.pron, v.example_fr as exampleFr, v.example_en as exampleEn, l.number as lesson
       FROM vocab_items v JOIN lessons l ON l.id=v.lesson_id
       WHERE l.number<=? AND v.example_fr<>''
       ORDER BY l.number, v.idx`,
    )
    .all(upto) as {
    fr: string;
    en: string;
    pron: string;
    exampleFr: string;
    exampleEn: string;
    lesson: number;
  }[];
  return NextResponse.json({ items, upto });
}
