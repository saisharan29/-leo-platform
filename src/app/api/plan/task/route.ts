import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/lib/session";
import { planRepo, isTaskStatus } from "@/server/repo/plan.repo";

const schema = z.object({ taskId: z.string().min(1), status: z.string().min(1) });

export async function PATCH(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: { code: "unauthorized", message: "Sign in required." } }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success || !isTaskStatus(parsed.data.status))
    return NextResponse.json({ error: { code: "invalid_input", message: "taskId and a valid status are required." } }, { status: 400 });
  const ok = planRepo.setStatus(userId, parsed.data.taskId, parsed.data.status);
  if (!ok) return NextResponse.json({ error: { code: "not_found", message: "Task not found." } }, { status: 404 });
  return NextResponse.json({ ok: true });
}
