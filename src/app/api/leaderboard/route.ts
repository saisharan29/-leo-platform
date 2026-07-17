import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/session";
import { planRepo } from "@/server/repo/plan.repo";
import { parisToday } from "@/lib/gamify";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: { code: "unauthorized", message: "Sign in required." } }, { status: 401 });
  const to = parisToday();
  const d = new Date(`${to}T12:00:00Z`); d.setUTCDate(d.getUTCDate() - 6);
  const from = d.toISOString().slice(0, 10);
  return NextResponse.json({ from, to, entries: planRepo.leaderboard(from, to) });
}
