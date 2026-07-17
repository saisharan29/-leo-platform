"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { speakFr, logPractice, type PracticeAnswer } from "@/lib/client/practice";

interface DueCard {
  id: string;
  fr: string;
  en: string;
  pron: string;
  exampleFr: string;
  exampleEn: string;
}

export default function ReviewPage() {
  const [cards, setCards] = useState<DueCard[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState({ again: 0, good: 0, easy: 0 });
  const [error, setError] = useState<string | null>(null);
  const [finishedXp, setFinishedXp] = useState<number | null>(null);
  const [answers] = useState<PracticeAnswer[]>([]);

  useEffect(() => {
    fetch("/api/srs/queue")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Could not load your deck."))))
      .then((d: { cards: DueCard[] }) => setCards(d.cards))
      .catch((e: Error) => setError(e.message));
  }, []);

  async function grade(g: "again" | "good" | "easy") {
    if (!cards) return;
    const card = cards[idx];
    answers.push({ qType: "type", skill: "vocab", correct: g !== "again" });
    setDone((d) => ({ ...d, [g]: d[g] + 1 }));
    setFlipped(false);
    fetch("/api/srs/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId: card.id, grade: g }),
    }).catch(() => {});
    if (idx + 1 >= cards.length) {
      const xp = await logPractice("review", answers);
      setFinishedXp(xp);
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
  if (!cards) return <p className="font-mono text-sm text-ink2">Loading deck…</p>;

  if (cards.length === 0)
    return (
      <div className="mx-auto max-w-md text-center">
        <p className="text-5xl" aria-hidden="true">
          🦊
        </p>
        <h1 className="mt-2 font-display text-2xl font-bold">Nothing due right now</h1>
        <p className="mt-1 text-ink2">
          Cards come back on a 1 / 3 / 7 / 14 / 30 / 60-day rhythm. Finish more lessons to grow the
          deck.
        </p>
        <Link href="/practice" className="mt-4 inline-block font-extrabold text-bleu hover:underline">
          Back to practice
        </Link>
      </div>
    );

  if (finishedXp !== null)
    return (
      <div className="mx-auto max-w-md text-center">
        <p className="text-5xl" aria-hidden="true">
          🎉
        </p>
        <h1 className="mt-2 font-display text-2xl font-bold">Deck cleared</h1>
        <p className="mt-1 text-ink2">
          {done.good + done.easy} remembered · {done.again} to see again tomorrow · +{finishedXp} XP
        </p>
        <Link href="/practice" className="mt-4 inline-block font-extrabold text-bleu hover:underline">
          Back to practice
        </Link>
      </div>
    );

  const card = cards[idx];
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <p className="font-mono text-sm text-ink2">
        Card {idx + 1}/{cards.length}
      </p>
      <Card className="p-8 text-center">
        <button
          type="button"
          onClick={() => speakFr(card.fr)}
          className="press font-display text-4xl font-bold text-bleu"
          lang="fr"
          aria-label={`Play: ${card.fr}`}
        >
          🔊 {card.fr}
        </button>
        <p className="mt-2 font-mono text-sm text-ink2">{card.pron}</p>
        {flipped ? (
          <div className="banner-in mt-6 border-t border-craie pt-6">
            <p className="text-xl font-extrabold">{card.en}</p>
            {card.exampleFr ? (
              <>
                <p className="mt-3" lang="fr">
                  {card.exampleFr}
                </p>
                <p className="text-sm text-ink2">{card.exampleEn}</p>
              </>
            ) : null}
          </div>
        ) : null}
      </Card>
      {!flipped ? (
        <Button size="lg" onClick={() => setFlipped(true)}>
          Show meaning
        </Button>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          <Button variant="danger" onClick={() => grade("again")}>
            Again · 1d
          </Button>
          <Button variant="soft" onClick={() => grade("good")}>
            Good
          </Button>
          <Button onClick={() => grade("easy")}>Easy</Button>
        </div>
      )}
    </div>
  );
}
