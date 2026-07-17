import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/session";
import { contentRepo } from "@/server/repo/content.repo";

export async function GET(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: { code: "unauthorized", message: "Sign in required." } }, { status: 401 });
  const q = (new URL(req.url).searchParams.get("q") ?? "").slice(0, 100);
  if (q.trim().length < 2) return NextResponse.json({ q, hits: [] });
  return NextResponse.json({ q, hits: contentRepo.search(q) });
}
