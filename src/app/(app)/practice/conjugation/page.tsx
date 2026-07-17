"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ALL_VERBS,
  PERSONS,
  TENSE_LABELS,
  conjugate,
  verbMeaning,
  withPronoun,
  type Tense,
} from "@/lib/engine/conjugator";
import { normalize, deaccent } from "@/lib/engine/text";
import { logPractice, speakFr, type PracticeAnswer } from "@/lib/client/practice";

const ROUND = 10;
const TENSES = Object.keys(TENSE_LABELS) as Tense[];

interface Drill {
  verb: string;
  tense: Tense;
  person: number;
  answer: string; // with pronoun
}

function makeRound(): Drill[] {
  const out: Drill[] = [];
  for (let i = 0; i < ROUND; i++) {
    const verb = ALL_VERBS[Math.floor(Math.random() * ALL_VERBS.length)];
    const tense = TENSES[Math.floor(Math.random() * TENSES.length)];
    const person = Math.floor(Math.random() * 6);
    out.push({ verb, tense, person, answer: withPronoun(person, conjugate(verb, tense)[person]) });
  }
  return out;
}

export default function ConjugationPage() {
  const [round, setRound] = useState<Drill[]>(() => makeRound());
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState("");
  const [checked, setChecked] = useState<null | boolean>(null);
  const [answers] = useState<PracticeAnswer[]>([]);
  const [xpEarned, setXpEarned] = useState<number | null>(null);

  const d = round[idx];
  const meaning = useMemo(() => verbMeaning(d.verb), [d.verb]);

  function check() {
    if (checked !== null) return;
    const a = normalize(input);
    const t = normalize(d.answer);
    const ok = a === t || deaccent(a) === deaccent(t);
    answers.push({ qType: "type", skill: "grammar", correct: ok });
    setChecked(ok);
    if (ok) speakFr(d.answer);
  }

  async function next() {
    setChecked(null);
    setInput("");
    if (idx + 1 >= round.length) {
      setXpEarned(await logPractice("conjugation", answers));
    } else {
      setIdx(idx + 1);
    }
  }

  if (xpEarned !== null) {
    const correct = answers.filter((a) => a.correct).length;
    return (
      <div className="mx-auto max-w-md text-center">
        <p className="text-5xl" aria-hidden="true">
          🔀
        </p>
        <h1 className="mt-2 font-display text-2xl font-bold">Round complete</h1>
        <p className="mt-1 text-ink2">
          {correct}/{answers.length} correct · +{xpEarned} XP
        </p>
        <div className="mt-4 flex justify-center gap-3">
          <Button
            onClick={() => {
              setRound(makeRound());
              setIdx(0);
              answers.length = 0;
              setXpEarned(null);
            }}
          >
            Another round
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
        {idx + 1}/{round.length}
      </p>
      <Card className="p-6">
        <p className="font-mono text-xs uppercase tracking-wide text-ink2">
          {TENSE_LABELS[d.tense]}
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold">
          <span lang="fr">{d.verb}</span>{" "}
          <span className="text-lg font-semibold text-ink2">({meaning})</span>
        </h1>
        <p className="mt-2 text-lg">
          Conjugate for <strong lang="fr">{PERSONS[d.person]}</strong>
        </p>
        <div className="mt-4 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") checked === null ? check() : next();
            }}
            disabled={checked !== null}
            lang="fr"
            aria-label="Conjugated form with pronoun"
            placeholder={`${PERSONS[d.person]} …`}
            className="h-11 flex-1 rounded-input border border-craie bg-card px-3.5"
            autoFocus
          />
          <Button onClick={check} disabled={checked !== null || !input.trim()}>
            Check
          </Button>
        </div>
        {checked !== null ? (
          <div
            className={`banner-in mt-4 rounded-input border p-3 ${
              checked ? "border-menthe/40 bg-menthe/10" : "border-groseille/40 bg-groseille/10"
            }`}
            role="status"
          >
            <p className="font-extrabold">
              {checked ? "Correct ✓" : "Not quite"} —{" "}
              <span lang="fr">{d.answer}</span>
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
