import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireUserId } from "@/lib/session";
import { usersRepo } from "@/server/repo/users.repo";
import { progressRepo } from "@/server/repo/progress.repo";
import { curriculumRepo } from "@/server/repo/curriculum.repo";
import { levelFromXp, unlockedThrough, parisToday } from "@/lib/gamify";
import { Card } from "@/components/ui/card";
import { StatTile, SkillBar } from "@/components/domain/stats";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

const SKILLS = ["vocab", "grammar", "listening", "reading", "writing", "speaking"] as const;

export default async function DashboardPage() {
  const userId = await requireUserId();
  if (!userId) redirect("/login");
  const profile = usersRepo.profile(userId);
  if (!profile) redirect("/login");

  const completed = progressRepo.completedNumbers(userId);
  const total = curriculumRepo.totalLessons();
  const next = Math.min(unlockedThrough(completed), total);
  const nextLesson = curriculumRepo.lessonByNumber(next);
  const { level, into, next: needed } = levelFromXp(profile.xp);
  const acc = progressRepo.overallAccuracy(userId);
  const skills = progressRepo.skillAverages(userId);
  const today = parisToday();
  const studiedToday = profile.last_study_date === today;
  const pctCourse = Math.round((completed.length / total) * 100);
  const { srsRepo } = await import("@/server/repo/srs.repo");
  const due = srsRepo.counts(userId).due;

  return (
    <div className="flex flex-col gap-6">
      <section className="flex items-start gap-4">
        <span className="float-y hidden text-6xl sm:block" aria-hidden="true">🦊</span>
        <div>
        <h1 className="font-display text-3xl font-bold pop-in">
          Bonjour, {profile.display_name} <span className="inline-block origin-[70%_70%] wiggle-target" aria-hidden="true">👋</span>
        </h1>
        <div className="relative mt-3 inline-block">
          <p className="text-lg text-ink2">
            {studiedToday
              ? "Streak safe for today — keep the momentum."
              : "You haven't studied yet today. One lesson keeps the streak alive."}
          </p>
          {/* le fil rouge — underline of the today line */}
          <svg
            className="absolute -bottom-2 left-0 h-3 w-full"
            viewBox="0 0 300 12"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              className="fil-rouge fil-rouge-draw"
              style={{ ["--fil-len" as string]: "310" }}
              d="M2 8 C 60 2, 120 12, 180 6 S 280 4, 298 7"
            />
          </svg>
        </div>
        <div className="mt-5 max-w-md">
          <div className="mb-1 flex items-baseline justify-between">
            <span className="font-mono text-xs font-bold text-ink2">LEVEL {level}</span>
            <span className="font-mono text-xs text-ink2">{into}/{needed} XP</span>
          </div>
          <div className="shimmer h-4 overflow-hidden rounded-full border border-craie bg-craie/50" role="progressbar" aria-valuenow={into} aria-valuemin={0} aria-valuemax={needed} aria-label={`Level ${level} progress`}>
            <div className="h-full rounded-full bg-gradient-to-r from-bleu to-brioche" style={{ width: `${Math.max(4, Math.round((into / needed) * 100))}%` }} />
          </div>
        </div>
        </div>
      </section>

      <section className="stagger grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile icon="⚡" label="Level" value={String(level)} hint={`${into}/${needed} XP to next`} />
        <StatTile icon="📘" label="Lessons done" value={`${completed.length}/${total}`} hint={`${pctCourse}% of course`} />
        <StatTile icon="🔥" label="Streak" value={`${profile.streak} d`} hint={`best ${profile.streak_best} d`} />
        <StatTile
          icon="🎯"
          label="Accuracy"
          value={acc.answered ? `${Math.round((acc.correct / acc.answered) * 100)}%` : "—"}
          hint={acc.answered ? `${acc.correct}/${acc.answered} correct` : "answer questions to see this"}
        />
      </section>

      {completed.length === 0 ? (
        <Card className="flex flex-col items-start gap-3 border-bleu/30 bg-bleu/5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-lg font-bold">Not a beginner?</h2>
            <p className="text-sm text-ink2">
              Take the 5-minute placement test and skip the lessons you already know.
            </p>
          </div>
          <Link href="/placement" className="font-extrabold text-bleu hover:underline">
            Take the placement test →
          </Link>
        </Card>
      ) : null}

      {due > 0 ? (
        <Card className="flex items-center justify-between gap-3 border-brioche/40 bg-brioche/5 p-5">
          <p className="font-extrabold">
            🃏 {due} word{due === 1 ? "" : "s"} due for review — five minutes keeps them yours.
          </p>
          <Link href="/practice/review" className="shrink-0 font-extrabold text-bleu hover:underline">
            Review now →
          </Link>
        </Card>
      ) : null}

      <Card className="pop-in relative flex flex-col items-start gap-4 overflow-hidden border-2 border-bleu/30 p-6 sm:flex-row sm:items-center sm:justify-between" style={{ animationDelay: "200ms" }}>
        <div aria-hidden="true" className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-bleu/10 blur-xl" />
        <div>
          <p className="font-mono text-xs uppercase tracking-wide text-bleu">▸ Continue</p>
          {nextLesson ? (
            <h2 className="mt-1 font-display text-2xl font-bold">
              Lesson {nextLesson.number} · {nextLesson.title}
            </h2>
          ) : (
            <h2 className="mt-1 font-display text-2xl font-bold">Course complete 🎉</h2>
          )}
          {nextLesson ? <p className="mt-1 text-ink2">{nextLesson.objective}</p> : null}
        </div>
        {nextLesson ? (
          <Link
            href={`/lesson/${nextLesson.number}`}
            className="chunky chunky-bleu inline-flex h-14 items-center gap-2 rounded-input bg-bleu px-7 py-3 text-lg font-extrabold text-white"
          >
            <span className="bounce-soft" aria-hidden="true">🚀</span> Start lesson {nextLesson.number}
          </Link>
        ) : (
          <Link
            href="/map"
            className="chunky chunky-bleu inline-flex h-14 items-center rounded-input bg-bleu px-7 py-3 text-lg font-extrabold text-white"
          >
            Review lessons
          </Link>
        )}
      </Card>

      <section>
        <h2 className="mb-3 font-display text-xl font-bold">Skills</h2>
        <Card className="grid gap-5 p-6 sm:grid-cols-2">
          {SKILLS.map((s) => (
            <SkillBar key={s} skill={s} pct={skills[s]?.pct ?? 0} n={skills[s]?.n ?? 0} />
          ))}
        </Card>
      </section>
    </div>
  );
}
