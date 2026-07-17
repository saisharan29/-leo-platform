import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/session";
import { srsRepo } from "@/server/repo/srs.repo";

export async function GET() {
  const userId = await requireUserId();
  if (!userId)
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Sign in required." } },
      { status: 401 },
    );
  return NextResponse.json({ cards: srsRepo.dueCards(userId, 20), ...srsRepo.counts(userId) });
}
