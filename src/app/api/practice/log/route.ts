import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/lib/session";
import { progressRepo } from "@/server/repo/progress.repo";
import { answerSchema } from "@/lib/zodschemas";
import { parisToday } from "@/lib/gamify";

const schema = z.object({
  kind: z.enum(["review", "dictation", "conjugation", "numbers", "arcade"]),
  answers: z.array(answerSchema).min(1).max(200),
  xp: z.number().int().min(0).max(200).default(0),
});

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId)
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Sign in required." } },
      { status: 401 },
    );
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: { code: "invalid_input", message: parsed.error.issues[0].message } },
      { status: 400 },
    );

  const { answers, xp } = parsed.data;
  progressRepo.logAnswers(userId, null, answers);
  const correct = answers.filter((a) => a.correct).length;
  // Practice XP is intentionally modest: 1 XP per correct answer, capped by the client claim.
  const grantXp = Math.min(xp, correct);
  progressRepo.bumpDailyStat(userId, parisToday(), {
    xp: grantXp,
    correct,
    answered: answers.length,
  });
  const { db } = await import("@/server/db");
  if (grantXp > 0)
    db.prepare(`UPDATE profiles SET xp=xp+? WHERE user_id=?`).run(grantXp, userId);
  return NextResponse.json({ ok: true, xp: grantXp, correct, answered: answers.length });
}
