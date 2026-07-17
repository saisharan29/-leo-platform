"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { speakFr } from "@/lib/client/practice";
import type { Question } from "@/lib/engine/types";

type Level = "A1" | "A2" | "B1" | "B2" | "C1";
interface Section {
  level: Level;
  questions: Question[];
}

export default function PlacementPage() {
  const router = useRouter();
  const [sections, setSections] = useState<Section[] | null>(null);
  const [si, setSi] = useState(0);
  const [qi, setQi] = useState(0);
  const [scores, setScores] = useState<Record<Level, { correct: number; answered: number }>>({
    A1: { correct: 0, answered: 0 },
    A2: { correct: 0, answered: 0 },
    B1: { correct: 0, answered: 0 },
    B2: { correct: 0, answered: 0 },
    C1: { correct: 0, answered: 0 },
  });
  const [result, setResult] = useState<{ level: Level; startLesson: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/placement")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Could not load the test."))))
      .then((d: { sections: Section[] }) => setSections(d.sections))
      .catch((e: Error) => setError(e.message));
  }, []);

  async function submit(finalScores: typeof scores) {
    setBusy(true);
    try {
      const res = await fetch("/api/placement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scores: (Object.keys(finalScores) as Level[]).map((level) => ({
            level,
            ...finalScores[level],
          })),
        }),
      });
      if (!res.ok) throw new Error("Could not save your placement.");
      const data = (await res.json()) as { level: Level; startLesson: number };
      setResult(data);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function answer(correct: boolean) {
    if (!sections) return;
    const level = sections[si].level;
    const next = {
      ...scores,
      [level]: { correct: scores[level].correct + (correct ? 1 : 0), answered: scores[level].answered + 1 },
    };
    setScores(next);

    const sec = sections[si];
    const lastInSection = qi + 1 >= sec.questions.length;
    if (!lastInSection) {
      setQi(qi + 1);
      return;
    }
    // Section done. Adaptive early exit: if this band was failed, stop — deeper bands won't pass.
    const s = next[level];
    const passed = s.answered >= 4 && s.correct / s.answered >= 0.7;
    const lastSection = si + 1 >= sections.length;
    if (!passed || lastSection) {
      void submit(next);
    } else {
      setSi(si + 1);
      setQi(0);
    }
  }

  if (error)
    return (
      <p role="alert" className="font-semibold text-groseille">
        {error}
      </p>
    );
  if (!sections) return <p className="font-mono text-sm text-ink2">Preparing your placement test…</p>;

  if (result)
    return (
      <div className="mx-auto max-w-md text-center">
        <p className="text-5xl" aria-hidden="true">
          🧭
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold">You start at {result.level}</h1>
        <p className="mt-1 text-ink2">
          {result.startLesson === 1
            ? "Everyone starts somewhere — Lesson 1 is the right first step."
            : `Lessons 1–${result.startLesson - 1} are marked cleared. Your path begins at lesson ${result.startLesson}.`}
        </p>
        <Link
          href={`/lesson/${result.startLesson}`}
          className="press mt-6 inline-flex h-12 items-center rounded-input bg-bleu px-6 text-lg font-extrabold text-white shadow-[0_2px_0_rgba(20,40,140,0.5)]"
        >
          Start lesson {result.startLesson}
        </Link>
      </div>
    );

  const sec = sections[si];
  const q = sec.questions[qi];
  if (!q || busy) return <p className="font-mono text-sm text-ink2">Scoring…</p>;
  if (q.type !== "mcq" && q.type !== "listen") {
    // Server only sends mcq/listen; guard anyway.
    answer(false);
    return null;
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <div className="flex justify-between font-mono text-sm text-ink2">
        <span>Section {sec.level}</span>
        <span>
          Question {qi + 1}/{sec.questions.length}
        </span>
      </div>
      <Card className="p-6">
        {q.type === "mcq" ? (
          <p className="font-display text-2xl font-bold">{q.prompt}</p>
        ) : (
          <>
            <p className="font-display text-2xl font-bold">What did you hear?</p>
            <div className="mt-3">
              <Button variant="soft" onClick={() => speakFr(q.say)}>
                🔊 Play audio
              </Button>
            </div>
          </>
        )}
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {q.options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => answer(opt === q.answer)}
              className="press min-h-[52px] rounded-input border border-craie bg-card px-4 py-2 text-left font-extrabold hover:bg-craie/40"
            >
              {opt}
            </button>
          ))}
        </div>
      </Card>
      <p className="text-center font-mono text-xs text-ink2">
        No feedback during placement — answer honestly, it only helps you.
      </p>
    </div>
  );
}
