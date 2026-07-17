import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/lib/session";
import { srsRepo } from "@/server/repo/srs.repo";

const schema = z.object({
  cardId: z.string().uuid(),
  grade: z.enum(["again", "good", "easy"]),
});

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId)
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Sign in required." } },
      { status: 401 },
    );
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: { code: "invalid_input", message: parsed.error.issues[0].message } },
      { status: 400 },
    );
  const ok = srsRepo.review(userId, parsed.data.cardId, parsed.data.grade);
  if (!ok)
    return NextResponse.json(
      { error: { code: "not_found", message: "Card not found." } },
      { status: 404 },
    );
  return NextResponse.json({ ok: true, ...srsRepo.counts(userId) });
}
