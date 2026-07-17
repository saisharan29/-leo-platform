import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/lib/session";
import { contentRepo } from "@/server/repo/content.repo";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: { code: "unauthorized", message: "Sign in required." } }, { status: 401 });
  return NextResponse.json({ bookmarks: contentRepo.bookmarks(userId) });
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: { code: "unauthorized", message: "Sign in required." } }, { status: 401 });
  const parsed = z.object({ lessonNumber: z.number().int().min(1).max(200) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: { code: "invalid_input", message: "lessonNumber required." } }, { status: 400 });
  const bookmarked = contentRepo.toggleBookmark(userId, parsed.data.lessonNumber);
  return NextResponse.json({ bookmarked });
}
