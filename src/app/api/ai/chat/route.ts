import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/lib/session";
import { aiRepo } from "@/server/repo/ai.repo";
import {
  buildSystemPrompt,
  AI_DAILY_QUOTA,
  ROLEPLAY_SCENES,
} from "@/lib/ai/prompts";

const schema = z.object({
  mode: z.enum(["chat", "roleplay", "writing", "interview"]),
  scene: z.enum(ROLEPLAY_SCENES).optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
      }),
    )
    .min(1)
    .max(40),
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

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey)
    return NextResponse.json(
      {
        error: {
          code: "ai_not_configured",
          message:
            "The AI tutor isn't configured on this server. Set ANTHROPIC_API_KEY in the environment to enable it.",
        },
      },
      { status: 503 },
    );

  const remaining = aiRepo.consumeQuota(userId, AI_DAILY_QUOTA);
  if (remaining < 0)
    return NextResponse.json(
      {
        error: {
          code: "quota_exceeded",
          message: `Daily tutor limit reached (${AI_DAILY_QUOTA} messages). It resets at midnight Paris time.`,
        },
      },
      { status: 429 },
    );

  const memory = aiRepo.memoryPack(userId);
  const system = buildSystemPrompt(parsed.data.mode, memory, parsed.data.scene);

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL ?? "claude-sonnet-4-6",
        max_tokens: 700,
        system,
        messages: parsed.data.messages,
      }),
    });
    if (!res.ok) {
      const detail = await res.text();
      return NextResponse.json(
        { error: { code: "ai_upstream", message: `Tutor service error (${res.status}).`, detail: detail.slice(0, 300) } },
        { status: 502 },
      );
    }
    const data = (await res.json()) as { content: { type: string; text?: string }[] };
    const text = data.content
      .filter((c) => c.type === "text" && c.text)
      .map((c) => c.text)
      .join("\n");
    return NextResponse.json({ reply: text, remaining });
  } catch {
    return NextResponse.json(
      { error: { code: "ai_network", message: "Couldn't reach the tutor service. Try again." } },
      { status: 502 },
    );
  }
}
