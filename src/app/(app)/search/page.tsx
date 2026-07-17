"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";

interface Hit { kind: "lesson" | "vocab"; ref: string; title: string; snippet: string }

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 2) { setHits([]); return; }
    timer.current = setTimeout(async () => {
      setBusy(true);
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        if (r.ok) setHits(((await r.json()) as { hits: Hit[] }).hits);
      } finally {
        setBusy(false);
      }
    }, 250);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [q]);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl font-bold">Search</h1>
      <p className="mt-1 text-ink2">Everything in the course: lessons, grammar, dialogues, all 672 words.</p>
      <input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Try “passé composé”, “fromage”, “bank”…"
        aria-label="Search the course"
        className="mt-4 h-12 w-full rounded-input border border-craie bg-card px-4 text-base"
      />
      <div className="mt-4 flex flex-col gap-2" aria-live="polite">
        {busy ? <p className="font-mono text-sm text-ink2">Searching…</p> : null}
        {!busy && q.trim().length >= 2 && hits.length === 0 ? (
          <p className="text-ink2">No matches for “{q}”.</p>
        ) : null}
        {hits.map((h, i) => (
          <Link key={`${h.kind}${h.ref}${i}`} href={`/lesson/${h.ref}`} className="block">
            <Card className="p-4 transition-transform hover:-translate-y-0.5">
              <p className="font-mono text-[10px] uppercase tracking-wide text-ink2">
                {h.kind === "lesson" ? "📘 Lesson" : "🔤 Vocabulary"} · opens lesson {h.ref}
              </p>
              <p className="mt-0.5 font-display text-lg font-bold" lang="fr">{h.title}</p>
              <p className="mt-1 text-sm text-ink2">
                {h.snippet.split(/(\[\[|\]\])/).map((part, j, arr) => {
                  if (part === "[[" || part === "]]") return null;
                  const highlighted = j > 0 && arr[j - 1] === "[[";
                  return highlighted ? (
                    <b key={j} className="font-extrabold text-bleu">{part}</b>
                  ) : (
                    <span key={j}>{part}</span>
                  );
                })}
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
