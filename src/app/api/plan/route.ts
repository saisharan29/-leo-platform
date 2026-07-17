import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/session";
import { planRepo } from "@/server/repo/plan.repo";
import { parisToday } from "@/lib/gamify";

export async function GET(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: { code: "unauthorized", message: "Sign in required." } }, { status: 401 });
  const url = new URL(req.url);
  const today = parisToday();
  const date = url.searchParams.get("date") ?? today;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
    return NextResponse.json({ error: { code: "invalid_input", message: "date must be YYYY-MM-DD" } }, { status: 400 });
  planRepo.sweepMissed(userId, today);
  // Only today (or future) generates; past days are read-only history.
  const tasks = date >= today ? planRepo.ensureDay(userId, date) : planRepo.byDate(userId, date);
  return NextResponse.json({ date, tasks });
}
