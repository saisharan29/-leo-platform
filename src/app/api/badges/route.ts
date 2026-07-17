import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/session";
import { badgesRepo } from "@/server/repo/badges.repo";

export async function GET() {
  const userId = await requireUserId();
  if (!userId)
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Sign in required." } },
      { status: 401 },
    );
  return NextResponse.json({ badges: badgesRepo.all(userId) });
}
