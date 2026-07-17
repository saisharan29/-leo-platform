"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { wordDiff } from "@/lib/engine/text";
import { speakFr, logPractice, type PracticeAnswer } from "@/lib/client/practice";

interface Item {
  fr: string;
  en: string;
  exampleFr: string;
  exampleEn: string;
  lesson: number;
}

const ROUND = 8;

export default function DictationPage() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState("");
  const [diff, setDiff] = useState<{ word: string; ok: boolean }[] | null>(null);
  const [answers] = useState<PracticeAnswer[]>([]);
  const [xpEarned, setXpEarned] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/practice/material")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Could not load sentences."))))
      .then((d: { items: Item[] }) => {
        // Shuffle once per session, keep a round of 8.
        const pool = [...d.items].sort(() => Math.random() - 0.5).slice(0, ROUND);
        setItems(pool);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  const current = items?.[idx];
  const target = useMemo(() => current?.exampleFr ?? "", [current]);

  function check() {
    if (!current || diff) return;
    const d = wordDiff(target, input);
    const correct = d.every((w) => w.ok);
    answers.push({ qType: "listen", skill: "listening", correct });
    setDiff(d);
  }

  async function next() {
    setDiff(null);
    setInput("");
    if (!items) return;
    if (idx + 1 >= items.length) {
      setXpEarned(await logPractice("dictation", answers));
    } else {
      setIdx(idx + 1);
    }
  }

  if (error)
    return (
      <p role="alert" className="font-semibold text-groseille">
        {error}
      </p>
    );
  if (!items) return <p className="font-mono text-sm text-ink2">Loading…</p>;
  if (items.length === 0)
    return (
      <p className="text-ink2">
        No material yet — finish Lesson 1 first, then come back.{" "}
        <Link href="/map" className="font-extrabold text-bleu hover:underline">
          Go to lessons
        </Link>
      </p>
    );

  if (xpEarned !== null) {
    const correct = answers.filter((a) => a.correct).length;
    return (
      <div className="mx-auto max-w-md text-center">
        <p className="text-5xl" aria-hidden="true">
          🎧
        </p>
        <h1 className="mt-2 font-display text-2xl font-bold">Dictation done</h1>
        <p className="mt-1 text-ink2">
          {correct}/{answers.length} perfect sentences · +{xpEarned} XP
        </p>
        <Link href="/practice" className="mt-4 inline-block font-extrabold text-bleu hover:underline">
          Back to practice
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <p className="font-mono text-sm text-ink2">
        Sentence {idx + 1}/{items.length} · from lesson {current!.lesson}
      </p>
      <Card className="p-6">
        <div className="flex gap-2">
          <Button onClick={() => speakFr(target)}>
            🔊 Play
          </Button>
          <Button variant="soft" onClick={() => speakFr(target, 0.7)}>
            🐢 Slow
          </Button>
        </div>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              check();
            }
          }}
          disabled={!!diff}
          lang="fr"
          aria-label="Type the sentence you heard, in French"
          placeholder="Type what you hear…"
          rows={2}
          className="mt-4 w-full rounded-input border border-craie bg-card p-3.5"
        />
        {!diff ? (
          <Button className="mt-3" onClick={check} disabled={!input.trim()}>
            Check
          </Button>
        ) : (
          <div className="banner-in mt-4">
            <p className="flex flex-wrap gap-x-1.5 text-lg" lang="fr" aria-label="Word by word result">
              {diff.map((w, i) => (
                <span
                  key={i}
                  className={`font-extrabold ${w.ok ? "text-menthe" : "text-groseille underline decoration-wavy"}`}
                >
                  {w.word}
                </span>
              ))}
            </p>
            <p className="mt-1 text-sm text-ink2">{current!.exampleEn}</p>
            <Button className="mt-3" onClick={next}>
              Continue
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
