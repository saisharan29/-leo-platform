"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { LessonContent, Question, MatchQ, OrderQ, SpeakQ } from "@/lib/engine/types";
import { isFillCorrect, isOrderCorrect, speakWordMatch } from "@/lib/engine/exercises";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LessonExtras } from "@/components/domain/lesson-extras";

/* ---------- speech helpers (browser-only, feature-detected) ---------- */

function speak(text: string, rate = 0.95) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "fr-FR";
  u.rate = rate;
  const fr = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith("fr"));
  if (fr) u.voice = fr;
  window.speechSynthesis.speak(u);
}

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function getRecognizer(): SpeechRecognitionLike | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (!Ctor) return null;
  const r = new Ctor();
  r.lang = "fr-FR";
  r.interimResults = false;
  r.maxAlternatives = 3;
  return r;
}

/* ---------- shared bits ---------- */

function SayButton({ text, label = "Listen" }: { text: string; label?: string }) {
  return (
    <Button variant="soft" onClick={() => speak(text)} aria-label={`${label}: play French audio`}>
      <span aria-hidden="true">🔊</span> {label}
    </Button>
  );
}

type Feedback = { ok: boolean; explain: string; willRepeat: boolean } | null;

interface AnswerRecord {
  qType: Question["type"];
  skill: Question["skill"];
  correct: boolean;
}

/* ---------- match question (fully state-driven; see ADR note) ---------- */
/*
 * Lesson carried over from the single-file build: its match UI died because a
 * DOM query for the counter returned null mid-round. Here every tile lives in
 * React state — there is no DOM lookup to go stale.
 */
function MatchBoard({ q, onDone }: { q: MatchQ; onDone: (mistakes: number) => void }) {
  const tiles = useMemo(() => {
    const t: { key: string; text: string; pair: number; side: 0 | 1 }[] = [];
    q.pairs.forEach(([fr, en], i) => {
      t.push({ key: `f${i}`, text: fr, pair: i, side: 0 });
      t.push({ key: `e${i}`, text: en, pair: i, side: 1 });
    });
    // deterministic shuffle from question id so re-render never reshuffles
    let s = 0;
    for (const c of q.id) s = (s * 31 + c.charCodeAt(0)) >>> 0;
    for (let i = t.length - 1; i > 0; i--) {
      s = (s * 1664525 + 1013904223) >>> 0;
      const j = s % (i + 1);
      [t[i], t[j]] = [t[j], t[i]];
    }
    return t;
  }, [q]);

  const [gone, setGone] = useState<Set<string>>(new Set());
  const [sel, setSel] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const mistakes = useRef(0);

  function tap(key: string) {
    if (gone.has(key) || flash) return;
    if (sel === key) {
      setSel(null);
      return;
    }
    if (!sel) {
      setSel(key);
      const t = tiles.find((x) => x.key === key);
      if (t && t.side === 0) speak(t.text);
      return;
    }
    const a = tiles.find((x) => x.key === sel)!;
    const b = tiles.find((x) => x.key === key)!;
    if (a.pair === b.pair && a.side !== b.side) {
      const next = new Set(gone);
      next.add(a.key);
      next.add(b.key);
      setGone(next);
      setSel(null);
      if (next.size === tiles.length) onDone(mistakes.current);
    } else {
      mistakes.current += 1;
      setFlash(key);
      setSel(null);
      setTimeout(() => setFlash(null), 350);
    }
  }

  const left = q.pairs.length - gone.size / 2;
  return (
    <div>
      <p className="mb-3 font-mono text-sm text-ink2">Pairs left: {left}</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {tiles.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => tap(t.key)}
            disabled={gone.has(t.key)}
            lang={t.side === 0 ? "fr" : undefined}
            className={`press min-h-[52px] rounded-input border px-3 py-2 text-sm font-extrabold transition-colors ${
              gone.has(t.key)
                ? "invisible"
                : flash === t.key
                  ? "border-groseille bg-groseille/15"
                  : sel === t.key
                    ? "border-bleu bg-bleu/10"
                    : "border-craie bg-card hover:bg-craie/40"
            }`}
          >
            {t.text}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------- order question ---------- */

function OrderBuilder({
  q,
  onCheck,
}: {
  q: OrderQ;
  onCheck: (tokens: string[]) => void;
}) {
  const [bank, setBank] = useState(() => q.bank.map((w, i) => ({ w, i })));
  const [line, setLine] = useState<{ w: string; i: number }[]>([]);

  return (
    <div>
      <p className="mb-1 text-ink2">
        Build the French for: <strong className="text-ink">{q.translation}</strong>
      </p>
      <div
        className="mb-3 flex min-h-[56px] flex-wrap items-center gap-2 rounded-input border border-dashed border-craie bg-card p-2"
        aria-label="Your sentence"
      >
        {line.length === 0 ? (
          <span className="px-2 text-sm text-ink2">Tap words below to build the sentence</span>
        ) : (
          line.map((t, idx) => (
            <button
              key={`${t.i}`}
              type="button"
              lang="fr"
              onClick={() => {
                setLine(line.filter((_, j) => j !== idx));
                setBank([...bank, t]);
              }}
              className="press rounded-input border border-bleu bg-bleu/10 px-3 py-1.5 text-sm font-extrabold"
            >
              {t.w}
            </button>
          ))
        )}
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {bank.map((t) => (
          <button
            key={`${t.i}`}
            type="button"
            lang="fr"
            onClick={() => {
              setBank(bank.filter((x) => x.i !== t.i));
              setLine([...line, t]);
            }}
            className="press rounded-input border border-craie bg-card px-3 py-1.5 text-sm font-extrabold hover:bg-craie/40"
          >
            {t.w}
          </button>
        ))}
      </div>
      <Button onClick={() => onCheck(line.map((t) => t.w))} disabled={line.length === 0}>
        Check
      </Button>
    </div>
  );
}

/* ---------- speak question ---------- */

function SpeakPanel({
  q,
  onResult,
  onSkip,
}: {
  q: SpeakQ;
  onResult: (ok: boolean) => void;
  onSkip: () => void;
}) {
  const [supported, setSupported] = useState(true);
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    setSupported(getRecognizer() !== null);
    return () => recRef.current?.stop();
  }, []);

  function start() {
    const rec = getRecognizer();
    if (!rec) {
      setSupported(false);
      return;
    }
    recRef.current = rec;
    setHeard(null);
    setListening(true);
    rec.onresult = (e) => {
      const best = e.results[0]?.[0]?.transcript ?? "";
      setHeard(best);
      onResult(speakWordMatch(q.target, best) >= 0.75);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    rec.start();
  }

  return (
    <div>
      <p className="font-display text-2xl font-bold" lang="fr">
        {q.target}
      </p>
      <p className="mt-1 font-mono text-sm text-ink2">{q.pron}</p>
      <p className="mt-1 text-ink2">{q.en}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <SayButton text={q.target} label="Hear it" />
        {supported ? (
          <Button onClick={start} disabled={listening}>
            {listening ? "Listening…" : "🎙️ Say it"}
          </Button>
        ) : null}
        <Button variant="ghost" onClick={onSkip}>
          {supported ? "Skip speaking" : "Practice aloud, then continue"}
        </Button>
      </div>
      {heard ? (
        <p className="mt-3 text-sm text-ink2">
          Heard: <span lang="fr">“{heard}”</span>
        </p>
      ) : null}
      {!supported ? (
        <p className="mt-3 text-sm text-ink2">
          Speech recognition isn’t available in this browser, so this step won’t be scored — say it
          out loud anyway, it works.
        </p>
      ) : null}
    </div>
  );
}

/* ---------- main player ---------- */

export function Player({
  lesson,
  questions,
  videos = [],
}: {
  lesson: LessonContent;
  questions: Question[];
  videos?: { id: string; title: string; youtube_id: string }[];
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<"teach" | "quiz" | "results">("teach");
  const [queue, setQueue] = useState<number[]>(() => questions.map((_, i) => i));
  const [pos, setPos] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [hearts, setHearts] = useState(5);
  const [input, setInput] = useState("");
  const firstAttempt = useRef<Map<string, AnswerRecord>>(new Map());
  const requeued = useRef<Set<string>>(new Set());
  const [posting, setPosting] = useState(false);
  const [result, setResult] = useState<{
    stars: number;
    rewards: { xp: number; coins: number; gems: number };
    streak: number;
    firstClear: boolean;
    newBadges?: { code: string; title: string; emoji: string }[];
    error?: string;
  } | null>(null);

  const qIndex = queue[pos];
  const q: Question | undefined = qIndex === undefined ? undefined : questions[qIndex];
  const totalSteps = queue.length;

  const record = useCallback(
    (question: Question, correct: boolean) => {
      if (!firstAttempt.current.has(question.id)) {
        firstAttempt.current.set(question.id, {
          qType: question.type,
          skill: question.skill,
          correct,
        });
      }
      let willRepeat = false;
      if (!correct) {
        setHearts((h) => Math.max(0, h - 1));
        if (!requeued.current.has(question.id)) {
          requeued.current.add(question.id);
          setQueue((prev) => [...prev, qIndex!]);
          willRepeat = true;
        }
      }
      setFeedback({ ok: correct, explain: question.explain, willRepeat });
    },
    [qIndex],
  );

  const advance = useCallback(() => {
    setFeedback(null);
    setInput("");
    if (pos + 1 >= queue.length) {
      setPhase("results");
    } else {
      setPos((p) => p + 1);
    }
  }, [pos, queue.length]);

  // keyboard: 1–4 select mcq/listen option, Enter continues past feedback
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (phase !== "quiz") return;
      if (feedback && e.key === "Enter") {
        e.preventDefault();
        advance();
        return;
      }
      if (!feedback && q && (q.type === "mcq" || q.type === "listen")) {
        const n = Number(e.key);
        if (n >= 1 && n <= q.options.length) {
          const target = e.target as HTMLElement | null;
          if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
          record(q, q.options[n - 1] === q.answer);
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [phase, feedback, q, record, advance]);

  // submit results once
  useEffect(() => {
    if (phase !== "results" || result || posting) return;
    const answers = [...firstAttempt.current.values()];
    if (answers.length === 0) {
      setResult({ stars: 0, rewards: { xp: 0, coins: 0, gems: 0 }, streak: 0, firstClear: false, error: "No scored answers this session." });
      return;
    }
    const accuracy = Math.round(
      (answers.filter((a) => a.correct).length / answers.length) * 100,
    );
    setPosting(true);
    fetch("/api/progress/lesson", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lessonNumber: lesson.number, accuracy, answers }),
    })
      .then(async (r) => {
        if (!r.ok) {
          const body = (await r.json().catch(() => null)) as { error?: { message?: string } } | null;
          throw new Error(body?.error?.message ?? "Could not save progress.");
        }
        return r.json();
      })
      .then((data: { stars: number; rewards: { xp: number; coins: number; gems: number }; streak: number; firstClear: boolean }) => {
        setResult(data);
        router.refresh(); // update XP/streak pills in the shell
      })
      .catch((err: Error) => {
        setResult({ stars: 0, rewards: { xp: 0, coins: 0, gems: 0 }, streak: 0, firstClear: false, error: err.message });
      })
      .finally(() => setPosting(false));
  }, [phase, result, posting, lesson.number, router]);

  /* ---------- teach phase ---------- */
  if (phase === "teach") {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <header>
          <p className="font-mono text-xs uppercase tracking-wide text-ink2">
            {lesson.level} · Lesson {lesson.number}
          </p>
          <h1 className="font-display text-3xl font-bold">{lesson.title}</h1>
          <p className="mt-1 text-ink2">{lesson.objective}</p>
        </header>

        <Card className="p-6">
          <h2 className="font-display text-xl font-bold">{lesson.grammar.title}</h2>
          <div className="mt-3 flex flex-col gap-2">
            {lesson.grammar.body.map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
          <ul className="mt-4 flex flex-col gap-2">
            {lesson.grammar.examples.map((ex, i) => (
              <li key={i} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-input bg-craie/30 p-3">
                <button
                  type="button"
                  onClick={() => speak(ex.fr)}
                  className="press font-extrabold text-bleu"
                  lang="fr"
                  aria-label={`Play: ${ex.fr}`}
                >
                  🔊 {ex.fr}
                </button>
                <span className="text-ink2">{ex.en}</span>
                <span className="w-full font-mono text-xs text-ink2">{ex.pron}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-6">
          <h2 className="font-display text-xl font-bold">Vocabulary · 8 words</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {lesson.vocab.map((v) => (
              <li key={v.fr} className="rounded-input border border-craie p-3">
                <button
                  type="button"
                  onClick={() => speak(v.fr)}
                  className="press font-display text-lg font-bold text-bleu"
                  lang="fr"
                  aria-label={`Play: ${v.fr}`}
                >
                  🔊 {v.fr}
                </button>
                <p className="text-sm">{v.en}</p>
                <p className="font-mono text-xs text-ink2">{v.pron}</p>
                <p className="mt-1 text-sm text-ink2" lang="fr">
                  {v.exampleFr}
                </p>
                <p className="text-xs text-ink2">{v.exampleEn}</p>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-6">
          <h2 className="font-display text-xl font-bold">Dialogue · {lesson.dialogue.scene}</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {lesson.dialogue.lines.map((l, i) => (
              <li key={i} className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-extrabold">{l.speaker}:</span>
                <button
                  type="button"
                  onClick={() => speak(l.fr)}
                  className="press text-left font-semibold text-bleu"
                  lang="fr"
                  aria-label={`Play: ${l.fr}`}
                >
                  {l.fr} 🔊
                </button>
                <span className="text-sm text-ink2">{l.en}</span>
              </li>
            ))}
          </ul>
        </Card>

        <LessonExtras lessonNumber={lesson.number} videoQuery={lesson.videoQuery} videos={videos} />

        <div className="flex justify-end">
          <Button size="lg" onClick={() => setPhase("quiz")}>
            Start exercises · {questions.length} questions
          </Button>
        </div>
      </div>
    );
  }

  /* ---------- results phase ---------- */
  if (phase === "results") {
    const answers = [...firstAttempt.current.values()];
    const correct = answers.filter((a) => a.correct).length;
    const accuracy = answers.length ? Math.round((correct / answers.length) * 100) : 0;
    return (
      <div className="mx-auto max-w-xl">
        <Card className="pop-in relative overflow-hidden p-8 text-center">
          {accuracy >= 80 ? (
            <div aria-hidden="true">
              {["🎊","⭐","🎉","✨","🥐","⭐","🎊","✨"].map((e, i) => (
                <span key={i} className="confetti" style={{ left: `${8 + i * 12}%`, animationDelay: `${i * 90}ms` }}>{e}</span>
              ))}
            </div>
          ) : null}
          <p className="float-y text-6xl" aria-hidden="true">
            {accuracy >= 80 ? "🎉" : "💪"}
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold">Lesson {lesson.number} complete</h1>
          <p className="mt-1 text-ink2">
            {correct}/{answers.length} first-attempt correct · {accuracy}%
          </p>
          {posting ? <p className="mt-4 font-mono text-sm text-ink2">Saving…</p> : null}
          {result ? (
            result.error ? (
              <p role="alert" className="mt-4 font-semibold text-groseille">
                {result.error}
              </p>
            ) : (
              <div className="mt-6 flex flex-col items-center gap-3">
                <p className="font-display text-5xl" aria-label={`${result.stars} of 3 stars`}>
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className={`inline-block ${i < result.stars ? ["tada", "tada-2", "tada-3"][i] + " text-brioche drop-shadow" : "text-craie"}`}
                      aria-hidden="true"
                    >
                      ★
                    </span>
                  ))}
                </p>
                <div className="flex gap-4 font-mono text-sm">
                  <span>⚡ +{result.rewards.xp} XP</span>
                  <span>🪙 +{result.rewards.coins}</span>
                  {result.rewards.gems > 0 ? <span>💎 +{result.rewards.gems}</span> : null}
                </div>
                <p className="text-sm text-ink2">🔥 Streak: {result.streak} day{result.streak === 1 ? "" : "s"}</p>
                {result.newBadges && result.newBadges.length > 0 ? (
                  <div className="banner-in mt-2 flex flex-col gap-2">
                    {result.newBadges.map((b) => (
                      <p
                        key={b.code}
                        className="rounded-input border border-brioche/50 bg-brioche/10 px-4 py-2 font-extrabold"
                      >
                        {b.emoji} Badge earned: {b.title}
                      </p>
                    ))}
                  </div>
                ) : null}
              </div>
            )
          ) : null}
          <div className="mt-8 flex justify-center gap-3">
            <Link
              href="/map"
              className="chunky chunky-bleu inline-flex h-11 items-center rounded-input bg-bleu px-5 font-extrabold text-white"
            >
              Back to the path
            </Link>
            <Link
              href="/dashboard"
              className="chunky inline-flex h-11 items-center rounded-input bg-craie/70 px-5 font-extrabold text-ink"
            >
              Dashboard
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  /* ---------- quiz phase ---------- */
  if (!q) return null;

  const progressPct = Math.round((pos / totalSteps) * 100);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <div className="flex items-center gap-4">
        {/* fil rouge as the player progress line */}
        <svg className="h-3 flex-1" viewBox="0 0 100 6" preserveAspectRatio="none" aria-hidden="true">
          <path d="M1 3 H99" stroke="rgb(var(--craie))" strokeWidth="4" strokeLinecap="round" fill="none" />
          <path
            d={`M1 3 H${Math.max(1, progressPct)}`}
            className="fil-rouge"
            strokeWidth="4"
          />
        </svg>
        <span className="font-mono text-sm text-ink2" aria-label={`Question ${pos + 1} of ${totalSteps}`}>
          {pos + 1}/{totalSteps}
        </span>
        <span className="font-mono text-sm" title="Mistakes left before hearts run out">
          {"❤️".repeat(hearts)}
          {hearts === 0 ? "🖤" : ""}
        </span>
      </div>

      <Card className="p-6">
        <p className="font-mono text-xs uppercase tracking-wide text-ink2">{q.kicker}</p>

        {q.type === "mcq" ? (
          <div className="mt-3">
            <p className="font-display text-2xl font-bold" lang={/[àâçéèêëîïôùûœ]|^(le |la |les |un |une )/i.test(q.prompt) ? "fr" : undefined}>
              {q.prompt}
            </p>
            {q.say ? (
              <div className="mt-3">
                <SayButton text={q.say} />
              </div>
            ) : null}
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {q.options.map((opt, i) => (
                <button
                  key={opt}
                  type="button"
                  disabled={!!feedback}
                  onClick={() => record(q, opt === q.answer)}
                  className="press min-h-[52px] rounded-input border border-craie bg-card px-4 py-2 text-left font-extrabold hover:bg-craie/40 disabled:opacity-60"
                >
                  <span className="mr-2 font-mono text-xs text-ink2">{i + 1}</span>
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {q.type === "listen" ? (
          <div className="mt-3">
            <p className="font-display text-2xl font-bold">What did you hear?</p>
            <div className="mt-3">
              <SayButton text={q.say} label="Play audio" />
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {q.options.map((opt, i) => (
                <button
                  key={opt}
                  type="button"
                  lang="fr"
                  disabled={!!feedback}
                  onClick={() => record(q, opt === q.answer)}
                  className="press min-h-[52px] rounded-input border border-craie bg-card px-4 py-2 text-left font-extrabold hover:bg-craie/40 disabled:opacity-60"
                >
                  <span className="mr-2 font-mono text-xs text-ink2">{i + 1}</span>
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {q.type === "fill" || q.type === "type" ? (
          <div className="mt-3">
            <p className="font-display text-2xl font-bold">{q.prompt}</p>
            <div className="mt-4 flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !feedback && input.trim()) record(q, isFillCorrect(q, input));
                }}
                disabled={!!feedback}
                lang="fr"
                aria-label="Your answer in French"
                placeholder="Type in French…"
                className="h-11 flex-1 rounded-input border border-craie bg-card px-3.5"
              />
              <Button onClick={() => record(q, isFillCorrect(q, input))} disabled={!!feedback || !input.trim()}>
                Check
              </Button>
            </div>
            {feedback && !feedback.ok ? (
              <p className="mt-2 text-sm">
                Answer: <strong lang="fr">{q.answerShown}</strong>
              </p>
            ) : null}
          </div>
        ) : null}

        {q.type === "match" ? (
          <div className="mt-3">
            <p className="mb-3 font-display text-2xl font-bold">Match the pairs</p>
            <MatchBoard
              key={q.id}
              q={q}
              onDone={(mistakes) => record(q, mistakes === 0)}
            />
          </div>
        ) : null}

        {q.type === "order" ? (
          <div className="mt-3">
            <p className="mb-3 font-display text-2xl font-bold">Build the sentence</p>
            <OrderBuilder key={q.id} q={q} onCheck={(tokens) => record(q, isOrderCorrect(q, tokens))} />
            {feedback && !feedback.ok ? (
              <p className="mt-2 text-sm">
                Answer: <strong lang="fr">{q.answer}</strong>
              </p>
            ) : null}
          </div>
        ) : null}

        {q.type === "speak" ? (
          <div className="mt-3">
            <p className="mb-3 font-display text-2xl font-bold">Say it in French</p>
            <SpeakPanel
              key={q.id}
              q={q}
              onResult={(ok) => record(q, ok)}
              onSkip={advance}
            />
          </div>
        ) : null}
      </Card>

      {feedback ? (
        <div
          role="status"
          className={`pop-in rounded-card border-2 p-4 ${
            feedback.ok
              ? "border-menthe/40 bg-menthe/10"
              : "border-groseille/40 bg-groseille/10"
          }`}
        >
          <p className="font-extrabold">
            {feedback.ok ? "✅ Correct !" : "❌ Not quite"}
            {feedback.willRepeat ? " — you'll see this one again." : ""}
          </p>
          <p className="mt-1 text-sm">{feedback.explain}</p>
          <div className="mt-3">
            <Button onClick={advance}>Continue</Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
