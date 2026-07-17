import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/lib/session";
import { contentRepo } from "@/server/repo/content.repo";

const schema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("lesson"), lessonNumber: z.number().int().min(1), title: z.string().min(1).max(120).optional(), objective: z.string().min(1).max(500).optional() }),
  z.object({ op: z.literal("vocab"), lessonNumber: z.number().int().min(1), idx: z.number().int().min(0), fr: z.string().min(1).max(120).optional(), en: z.string().min(1).max(200).optional(), pron: z.string().min(1).max(120).optional() }),
  z.object({ op: z.literal("video_add"), lessonNumber: z.number().int().min(1), title: z.string().min(1).max(160), youtubeId: z.string().regex(/^[\w-]{6,20}$/) }),
  z.object({ op: z.literal("video_del"), id: z.string().min(1) }),
]);

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: { code: "unauthorized", message: "Sign in required." } }, { status: 401 });
  if (contentRepo.role(userId) !== "admin")
    return NextResponse.json({ error: { code: "forbidden", message: "Admin role required." } }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: { code: "invalid_input", message: parsed.error.issues[0].message } }, { status: 400 });
  const d = parsed.data;
  if (d.op === "lesson") {
    const ok = contentRepo.updateLessonText(d.lessonNumber, { title: d.title, objective: d.objective });
    return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: { code: "not_found", message: "Lesson not found or empty patch." } }, { status: 404 });
  }
  if (d.op === "vocab") {
    const ok = contentRepo.updateVocab(d.lessonNumber, d.idx, { fr: d.fr, en: d.en, pron: d.pron });
    return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: { code: "not_found", message: "Vocab item not found or empty patch." } }, { status: 404 });
  }
  if (d.op === "video_add") {
    const id = contentRepo.addVideo(d.lessonNumber, d.title, d.youtubeId);
    return NextResponse.json({ ok: true, id });
  }
  const ok = contentRepo.deleteVideo(d.id);
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: { code: "not_found", message: "Video not found." } }, { status: 404 });
}
