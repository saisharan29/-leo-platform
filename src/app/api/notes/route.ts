import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/lib/session";
import { contentRepo } from "@/server/repo/content.repo";

const putSchema = z.object({
  lessonNumber: z.number().int().min(1).max(200),
  body: z.string().max(5000),
});

export async function GET(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: { code: "unauthorized", message: "Sign in required." } }, { status: 401 });
  const n = new URL(req.url).searchParams.get("lesson");
  if (n) {
    const note = contentRepo.note(userId, Number(n));
    return NextResponse.json({ note: note ?? null });
  }
  return NextResponse.json({ notes: contentRepo.notes(userId) });
}

export async function PUT(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: { code: "unauthorized", message: "Sign in required." } }, { status: 401 });
  const parsed = putSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: { code: "invalid_input", message: parsed.error.issues[0].message } }, { status: 400 });
  if (parsed.data.body.trim() === "") contentRepo.deleteNote(userId, parsed.data.lessonNumber);
  else contentRepo.upsertNote(userId, parsed.data.lessonNumber, parsed.data.body);
  return NextResponse.json({ ok: true });
}
