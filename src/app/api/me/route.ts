import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/session";
import { usersRepo } from "@/server/repo/users.repo";
import { progressRepo } from "@/server/repo/progress.repo";
import { profilePatchSchema } from "@/lib/zodschemas";
import { levelFromXp, unlockedThrough } from "@/lib/gamify";
import { curriculumRepo } from "@/server/repo/curriculum.repo";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: { code: "unauthorized", message: "Sign in required." } }, { status: 401 });
  const p = usersRepo.profile(userId)!;
  const completed = progressRepo.completedNumbers(userId);
  const acc = progressRepo.overallAccuracy(userId);
  return NextResponse.json({
    displayName: p.display_name, avatar: p.avatar, theme: p.theme, dailyGoalXp: p.daily_goal_xp,
    leaderboardOptIn: Boolean((p as unknown as { leaderboard_opt_in?: number }).leaderboard_opt_in),
    xp: p.xp, coins: p.coins, gems: p.gems, streak: p.streak, streakBest: p.streak_best,
    level: levelFromXp(p.xp),
    lessonsDone: completed.length, totalLessons: curriculumRepo.totalLessons(),
    unlockedThrough: unlockedThrough(completed),
    accuracy: acc.answered ? Math.round((acc.correct / acc.answered) * 100) : 0,
    answered: acc.answered,
    skills: progressRepo.skillAverages(userId),
  });
}

export async function PATCH(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: { code: "unauthorized", message: "Sign in required." } }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = profilePatchSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: { code: "invalid_input", message: parsed.error.issues[0].message } }, { status: 400 });
  const { displayName, avatar, dailyGoalXp, theme, leaderboardOptIn } = parsed.data;
  usersRepo.updateProfile(userId, {
    ...(displayName && { display_name: displayName }),
    ...(avatar && { avatar }),
    ...(dailyGoalXp && { daily_goal_xp: dailyGoalXp }),
    ...(theme && { theme }),
    ...(leaderboardOptIn !== undefined && { leaderboard_opt_in: leaderboardOptIn ? 1 : 0 }),
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: { code: "unauthorized", message: "Sign in required." } }, { status: 401 });
  usersRepo.deleteUser(userId);
  return new NextResponse(null, { status: 204 });
}
