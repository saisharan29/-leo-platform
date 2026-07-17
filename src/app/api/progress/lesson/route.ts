import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/session";
import { lessonCompleteSchema } from "@/lib/zodschemas";
import { progressRepo } from "@/server/repo/progress.repo";
import { usersRepo } from "@/server/repo/users.repo";
import { db } from "@/server/db";
import { starsFor, lessonRewards, nextStreak, parisToday, unlockedThrough } from "@/lib/gamify";

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: { code: "unauthorized", message: "Sign in required." } }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = lessonCompleteSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: { code: "invalid_input", message: parsed.error.issues[0].message } }, { status: 400 });

  const { lessonNumber, accuracy, answers } = parsed.data;
  const unlocked = unlockedThrough(progressRepo.completedNumbers(userId));
  if (lessonNumber > unlocked)
    return NextResponse.json({ error: { code: "locked", message: "Lesson is locked." } }, { status: 403 });

  const stars = starsFor(accuracy);
  const { firstClear } = progressRepo.upsertCompletion(userId, lessonNumber, stars, accuracy);
  const rewards = lessonRewards(accuracy, firstClear);
  progressRepo.logAnswers(userId, lessonNumber, answers);

  const profile = usersRepo.profile(userId)!;
  const today = parisToday();
  const streak = nextStreak(profile.last_study_date, today, profile.streak);
  db.prepare(`UPDATE profiles SET xp=xp+?, coins=coins+?, gems=gems+?, streak=?, streak_best=MAX(streak_best,?), last_study_date=? WHERE user_id=?`)
    .run(rewards.xp, rewards.coins, rewards.gems, streak, streak, today, userId);
  progressRepo.bumpDailyStat(userId, today, {
    xp: rewards.xp, lessons: firstClear ? 1 : 0,
    correct: answers.filter(a => a.correct).length, answered: answers.length,
  });

  const after = usersRepo.profile(userId)!;
  // Phase 2: feed the SRS deck and evaluate badges on every completion.
  const { srsRepo } = await import("@/server/repo/srs.repo");
  const { badgesRepo } = await import("@/server/repo/badges.repo");
  const srsAdded = firstClear ? srsRepo.addLessonVocab(userId, lessonNumber) : 0;
  const newBadges = badgesRepo.awardQualified(userId, {
    completedNumbers: progressRepo.completedNumbers(userId),
    starsByNumber: progressRepo.starsByNumber(userId),
    streak: after.streak,
    coins: after.coins,
  });
  return NextResponse.json({
    stars, rewards, firstClear, streak,
    xp: after.xp, coins: after.coins, gems: after.gems,
    unlockedThrough: unlockedThrough(progressRepo.completedNumbers(userId)),
    newBadges, srsAdded,
  });
}
