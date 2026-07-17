import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/session";
import { planRepo } from "@/server/repo/plan.repo";
import { parisToday } from "@/lib/gamify";

function shiftDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: { code: "unauthorized", message: "Sign in required." } }, { status: 401 });
  const range = new URL(req.url).searchParams.get("range") === "month" ? "month" : "week";
  const to = parisToday();
  const from = shiftDays(to, range === "month" ? -29 : -6);
  return NextResponse.json({ range, from, to, ...planRepo.report(userId, from, to) });
}
