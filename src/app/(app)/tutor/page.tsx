"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ROLEPLAY_SCENES, type RoleplayScene, type TutorMode } from "@/lib/ai/prompts";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const MODES: { id: TutorMode; title: string; desc: string; starter: string }[] = [
  { id: "chat", title: "Ask Léo", desc: "Grammar questions, explanations, anything French.", starter: "Ask a question about French…" },
  { id: "roleplay", title: "Roleplay", desc: "Practice real scenes — Léo stays in character.", starter: "Say your opening line in French…" },
  { id: "writing", title: "Writing coach", desc: "Submit French text, get corrections + a /20 mark.", starter: "Paste or write your French text…" },
  { id: "interview", title: "Interview practice", desc: "A French hiring manager grills you, kindly.", starter: "Introduce yourself in French to begin…" },
];

const SCENE_LABEL: Record<RoleplayScene, string> = {
  restaurant: "🍽️ Restaurant", shopping: "🛍️ Shopping", doctor: "🩺 Doctor",
  university: "🎓 University", office: "💼 Office", travel: "✈️ Travel",
  hotel: "🏨 Hotel", bank: "🏦 Bank", apartment: "🏠 Apartment hunt", phone: "📞 Phone call",
};

export default function TutorPage() {
  const [mode, setMode] = useState<TutorMode | null>(null);
  const [scene, setScene] = useState<RoleplayScene>("restaurant");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  async function send() {
    const content = input.trim();
    if (!content || busy || !mode) return;
    setError(null);
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode, scene: mode === "roleplay" ? scene : undefined, messages: next.slice(-20) }),
      });
      const data = (await res.json()) as {
        reply?: string;
        remaining?: number;
        error?: { message?: string };
      };
      if (!res.ok) {
        setError(data.error?.message ?? "Something went wrong.");
        return;
      }
      setMessages([...next, { role: "assistant", content: data.reply ?? "" }]);
      if (typeof data.remaining === "number") setRemaining(data.remaining);
    } catch {
      setError("Network error — check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!mode) {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-3xl font-bold">Tutor</h1>
        <p className="mt-1 text-ink2">
          Léo remembers your weak words and skills from real practice data and works them into the
          conversation.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => { setMode(m.id); setMessages([]); setError(null); }}
              className="press text-left"
            >
              <Card className="h-full p-5 transition-transform hover:-translate-y-0.5">
                <h2 className="font-display text-xl font-bold">{m.title}</h2>
                <p className="mt-1 text-sm text-ink2">{m.desc}</p>
              </Card>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const modeDef = MODES.find((m) => m.id === mode)!;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="soft" onClick={() => setMode(null)}>← Modes</Button>
        <h1 className="font-display text-2xl font-bold">{modeDef.title}</h1>
        {remaining !== null ? (
          <span className="ml-auto font-mono text-xs text-ink2">{remaining} messages left today</span>
        ) : null}
      </div>

      {mode === "roleplay" ? (
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Roleplay scene">
          {ROLEPLAY_SCENES.map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={scene === s}
              onClick={() => { setScene(s); setMessages([]); }}
              className={`press rounded-full border px-3 py-1.5 text-sm font-extrabold ${
                scene === s ? "border-bleu bg-bleu/10 text-bleu" : "border-craie bg-card"
              }`}
            >
              {SCENE_LABEL[s]}
            </button>
          ))}
        </div>
      ) : null}

      <Card className="flex min-h-[380px] flex-col gap-3 p-4">
        {messages.length === 0 ? (
          <p className="m-auto max-w-sm text-center text-ink2">
            {mode === "roleplay"
              ? `Scene set: ${SCENE_LABEL[scene]}. Open in French — Léo answers in character.`
              : modeDef.desc}
          </p>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[85%] whitespace-pre-wrap rounded-card px-4 py-3 text-sm ${
                m.role === "user" ? "self-end bg-bleu text-white" : "self-start border border-craie bg-paper"
              }`}
              lang={m.role === "assistant" ? "fr" : undefined}
            >
              {m.content}
            </div>
          ))
        )}
        {busy ? <p className="self-start px-2 font-mono text-xs text-ink2">Léo is typing…</p> : null}
        <div ref={endRef} />
      </Card>

      {error ? (
        <p role="alert" className="rounded-input border border-groseille/40 bg-groseille/10 p-3 text-sm font-semibold">
          {error}
        </p>
      ) : null}

      <div className="flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
          }}
          rows={2}
          placeholder={modeDef.starter}
          aria-label="Message to Léo"
          className="flex-1 resize-none rounded-input border border-craie bg-card p-3 text-sm"
        />
        <Button onClick={send} disabled={busy || !input.trim()}>Send</Button>
      </div>
      <p className="font-mono text-xs text-ink2">
        Léo sees text only — it never scores your accent, and it won't do graded exercises for you.
      </p>
    </div>
  );
}
