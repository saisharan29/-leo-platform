"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { numToFrench } from "@/lib/engine/numbers";
import { normalize, deaccent } from "@/lib/engine/text";
import { logPractice, speakFr, type PracticeAnswer } from "@/lib/client/practice";

const ROUND = 10;

function pickNumbers(): number[] {
  const out: number[] = [];
  const bands: [number, number][] = [
    [0, 16],
    [17, 69],
    [70, 99], // the famous trap zone
    [100, 999],
    [1000, 9999],
  ];
  for (let i = 0; i < ROUND; i++) {
    const [lo, hi] = bands[i % bands.length];
    out.push(lo + Math.floor(Math.random() * (hi - lo + 1)));
  }
  return out.sort(() => Math.random() - 0.5);
}

export default function NumbersPage() {
  const [nums, setNums] = useState<number[]>(() => pickNumbers());
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState("");
  const [checked, setChecked] = useState<null | boolean>(null);
  const [answers] = useState<PracticeAnswer[]>([]);
  const [xpEarned, setXpEarned] = useState<number | null>(null);

  const n = nums[idx];
  const target = numToFrench(n);

  function check() {
    if (checked !== null) return;
    const ok = deaccent(normalize(input)).replace(/-/g, " ") === deaccent(normalize(target)).replace(/-/g, " ");
    answers.push({ qType: "type", skill: "vocab", correct: ok });
    setChecked(ok);
    if (ok) speakFr(target);
  }

  async function next() {
    setChecked(null);
    setInput("");
    if (idx + 1 >= nums.length) {
      setXpEarned(await logPractice("numbers", answers));
    } else {
      setIdx(idx + 1);
    }
  }

  if (xpEarned !== null) {
    const correct = answers.filter((a) => a.correct).length;
    return (
      <div className="mx-auto max-w-md text-center">
        <p className="text-5xl" aria-hidden="true">
          🔢
        </p>
        <h1 className="mt-2 font-display text-2xl font-bold">Dash finished</h1>
        <p className="mt-1 text-ink2">
          {correct}/{answers.length} correct · +{xpEarned} XP
        </p>
        <div className="mt-4 flex justify-center gap-3">
          <Button
            onClick={() => {
              setNums(pickNumbers());
              setIdx(0);
              answers.length = 0;
              setXpEarned(null);
            }}
          >
            Another dash
          </Button>
          <Link
            href="/practice"
            className="press inline-flex h-11 items-center rounded-input bg-craie/60 px-5 font-extrabold"
          >
            Back
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <p className="font-mono text-sm text-ink2">
        {idx + 1}/{nums.length}
      </p>
      <Card className="p-6 text-center">
        <p className="font-display text-6xl font-bold">{n}</p>
        <p className="mt-1 text-sm text-ink2">Write it out in French (hyphens optional)</p>
        <div className="mt-4 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") checked === null ? check() : next();
            }}
            disabled={checked !== null}
            lang="fr"
            aria-label="The number written out in French"
            placeholder="soixante-dix-neuf…"
            className="h-11 flex-1 rounded-input border border-craie bg-card px-3.5"
            autoFocus
          />
          <Button onClick={check} disabled={checked !== null || !input.trim()}>
            Check
          </Button>
        </div>
        {checked !== null ? (
          <div
            className={`banner-in mt-4 rounded-input border p-3 text-left ${
              checked ? "border-menthe/40 bg-menthe/10" : "border-groseille/40 bg-groseille/10"
            }`}
            role="status"
          >
            <p className="font-extrabold">
              {checked ? "Correct ✓" : "Not quite"} — <span lang="fr">{target}</span>
            </p>
            <Button className="mt-2" onClick={next}>
              Continue
            </Button>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
