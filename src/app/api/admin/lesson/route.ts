import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/session";
import { contentRepo } from "@/server/repo/content.repo";
import { curriculumRepo } from "@/server/repo/curriculum.repo";

export async function GET(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: { code: "unauthorized", message: "Sign in required." } }, { status: 401 });
  if (contentRepo.role(userId) !== "admin")
    return NextResponse.json({ error: { code: "forbidden", message: "Admin role required." } }, { status: 403 });
  const n = Number(new URL(req.url).searchParams.get("number"));
  const lesson = Number.isInteger(n) ? curriculumRepo.lessonByNumber(n) : undefined;
  if (!lesson) return NextResponse.json({ error: { code: "not_found", message: "Lesson not found." } }, { status: 404 });
  return NextResponse.json({
    number: lesson.number,
    title: lesson.title,
    objective: lesson.objective,
    vocab: lesson.vocab.map((v, idx) => ({ idx, fr: v.fr, en: v.en, pron: v.pron })),
    videos: contentRepo.videos(lesson.number),
  });
}
