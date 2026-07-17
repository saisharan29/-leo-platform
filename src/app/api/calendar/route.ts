import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/session";
import { planRepo } from "@/server/repo/plan.repo";

export async function GET(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: { code: "unauthorized", message: "Sign in required." } }, { status: 401 });
  const url = new URL(req.url);
  const month = url.searchParams.get("month"); // YYYY-MM
  const year = url.searchParams.get("year");   // YYYY
  if (month && /^\d{4}-\d{2}$/.test(month)) return NextResponse.json({ month, days: planRepo.month(userId, month) });
  if (year && /^\d{4}$/.test(year)) return NextResponse.json({ year, heatmap: planRepo.heatmap(userId, year) });
  return NextResponse.json({ error: { code: "invalid_input", message: "Pass month=YYYY-MM or year=YYYY." } }, { status: 400 });
}
