import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireUserId } from "@/lib/session";
import { curriculumRepo } from "@/server/repo/curriculum.repo";
import { progressRepo } from "@/server/repo/progress.repo";
import { unlockedThrough } from "@/lib/gamify";
import { generateExercises } from "@/lib/engine/exercises";
import { Player } from "@/components/domain/player";
import { contentRepo } from "@/server/repo/content.repo";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { number: string };
}): Promise<Metadata> {
  const n = Number(params.number);
  const lesson = Number.isInteger(n) ? curriculumRepo.lessonByNumber(n) : undefined;
  return { title: lesson ? `Lesson ${lesson.number} · ${lesson.title}` : "Lesson" };
}

export default async function LessonPage({ params }: { params: { number: string } }) {
  const userId = await requireUserId();
  if (!userId) redirect("/login");

  const n = Number(params.number);
  if (!Number.isInteger(n) || n < 1) notFound();
  const lesson = curriculumRepo.lessonByNumber(n);
  if (!lesson) notFound();

  const completed = progressRepo.completedNumbers(userId);
  const maxUnlocked = unlockedThrough(completed);
  if (n > maxUnlocked) redirect("/map");

  // Seed varies per day so repeats stay fresh but a reload mid-lesson is stable.
  const seed = n * 1000 + new Date().getUTCDate();
  const questions = generateExercises(lesson, seed);

  const videos = contentRepo.videos(n);
  return <Player lesson={lesson} questions={questions} videos={videos} />;
}
