"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { deaccent, normalize } from "@/lib/engine/text";
import { logPractice, speakFr, type PracticeAnswer } from "@/lib/client/practice";

interface Item {
  fr: string;
  en: string;
  lesson: number;
}

type GameId = "memory" | "speed" | "wordsearch" | "crossword";

const GAMES: { id: GameId; icon: string; title: string; desc: string }[] = [
  { id: "memory", icon: "🧠", title: "Memory", desc: "Flip cards, find FR↔EN pairs" },
  { id: "speed", icon: "⏱️", title: "Speed quiz", desc: "60 seconds, as many as you can" },
  { id: "wordsearch", icon: "🔎", title: "Word search", desc: "Find the French words in the grid" },
  { id: "crossword", icon: "✏️", title: "Crossword", desc: "English clues, French answers" },
];

function sample<T>(arr: T[], n: number): T[] {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, n);
}

/* ============================ Memory ============================ */

function Memory({ items, onExit }: { items: Item[]; onExit: (a: PracticeAnswer[]) => void }) {
  const pairs = useMemo(() => sample(items, 6), [items]);
  const tiles = useMemo(
    () =>
      sample(
        pairs.flatMap((p, i) => [
          { key: `f${i}`, text: p.fr, pair: i, fr: true },
          { key: `e${i}`, text: p.en, pair: i, fr: false },
        ]),
        12,
      ),
    [pairs],
  );
  const [open, setOpen] = useState<string[]>([]);
  const [gone, setGone] = useState<Set<string>>(new Set());
  const answers = useRef<PracticeAnswer[]>([]);

  function tap(key: string) {
    if (gone.has(key) || open.includes(key) || open.length === 2) return;
    const t = tiles.find((x) => x.key === key)!;
    if (t.fr) speakFr(t.text);
    const now = [...open, key];
    setOpen(now);
    if (now.length === 2) {
      const [a, b] = now.map((k) => tiles.find((x) => x.key === k)!);
      const hit = a.pair === b.pair && a.fr !== b.fr;
      answers.current.push({ qType: "match", skill: "vocab", correct: hit });
      setTimeout(() => {
        if (hit) {
          setGone((g) => {
            const next = new Set(g);
            next.add(a.key);
            next.add(b.key);
            if (next.size === tiles.length) onExit(answers.current);
            return next;
          });
        }
        setOpen([]);
      }, hit ? 250 : 650);
    }
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {tiles.map((t) => {
        const shown = open.includes(t.key) || gone.has(t.key);
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => tap(t.key)}
            disabled={gone.has(t.key)}
            lang={t.fr ? "fr" : undefined}
            className={`press min-h-[64px] rounded-input border p-2 text-sm font-extrabold transition-colors ${
              gone.has(t.key)
                ? "border-menthe/40 bg-menthe/10 opacity-60"
                : shown
                  ? "border-bleu bg-bleu/10"
                  : "border-craie bg-craie/40 text-transparent"
            }`}
            aria-label={shown ? t.text : "Hidden card"}
          >
            {shown ? t.text : "?"}
          </button>
        );
      })}
    </div>
  );
}

/* ============================ Speed quiz ============================ */

function Speed({ items, onExit }: { items: Item[]; onExit: (a: PracticeAnswer[]) => void }) {
  const [seconds, setSeconds] = useState(60);
  const [score, setScore] = useState(0);
  const answers = useRef<PracticeAnswer[]>([]);
  const [q, setQ] = useState(() => makeQ(items));

  function makeQ(pool: Item[]) {
    const [it, ...rest] = sample(pool, 4);
    return { it, options: sample([it.en, ...rest.map((r) => r.en)], 4) };
  }

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (seconds <= 0) onExit(answers.current);
  }, [seconds, onExit]);

  function pick(opt: string) {
    const ok = opt === q.it.en;
    answers.current.push({ qType: "mcq", skill: "vocab", correct: ok });
    if (ok) setScore((s) => s + 1);
    setQ(makeQ(items));
  }

  return (
    <div>
      <div className="mb-3 flex justify-between font-mono text-sm">
        <span aria-live="polite">⏱️ {seconds}s</span>
        <span>✓ {score}</span>
      </div>
      <p className="font-display text-3xl font-bold" lang="fr">
        {q.it.fr}
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {q.options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => pick(o)}
            className="press min-h-[52px] rounded-input border border-craie bg-card px-4 py-2 text-left font-extrabold hover:bg-craie/40"
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ============================ Word search ============================ */

const SIZE = 10;

function buildWordSearch(words: string[]): { grid: string[][]; placed: string[] } {
  const grid: (string | null)[][] = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
  const placed: string[] = [];
  const dirs = [
    [0, 1],
    [1, 0],
    [1, 1],
  ];
  for (const raw of words) {
    const w = deaccent(raw.toUpperCase()).replace(/[^A-Z]/g, "");
    if (w.length < 3 || w.length > SIZE) continue;
    let done = false;
    for (let tries = 0; tries < 60 && !done; tries++) {
      const [dr, dc] = dirs[Math.floor(Math.random() * dirs.length)];
      const r0 = Math.floor(Math.random() * (SIZE - dr * (w.length - 1)));
      const c0 = Math.floor(Math.random() * (SIZE - dc * (w.length - 1)));
      let ok = true;
      for (let i = 0; i < w.length; i++) {
        const cell = grid[r0 + dr * i][c0 + dc * i];
        if (cell !== null && cell !== w[i]) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;
      for (let i = 0; i < w.length; i++) grid[r0 + dr * i][c0 + dc * i] = w[i];
      placed.push(raw);
      done = true;
    }
  }
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const full = grid.map((row) => row.map((c) => c ?? alphabet[Math.floor(Math.random() * 26)]));
  return { grid: full, placed };
}

function WordSearch({ items, onExit }: { items: Item[]; onExit: (a: PracticeAnswer[]) => void }) {
  const pool = useMemo(() => sample(items, 8).map((i) => i.fr.replace(/^(le|la|les|l'|un|une|des)\s+/i, "")), [items]);
  const { grid, placed } = useMemo(() => buildWordSearch(pool), [pool]);
  const [sel, setSel] = useState<[number, number][]>([]);
  const [found, setFound] = useState<Set<string>>(new Set());
  const answers = useRef<PracticeAnswer[]>([]);

  const cleaned = useMemo(
    () => placed.map((p) => ({ raw: p, key: deaccent(p.toUpperCase()).replace(/[^A-Z]/g, "") })),
    [placed],
  );

  function tap(r: number, c: number) {
    const next: [number, number][] = [...sel, [r, c]];
    setSel(next);
    const letters = next.map(([rr, cc]) => grid[rr][cc]).join("");
    const hit = cleaned.find((w) => w.key === letters && !found.has(w.key));
    if (hit) {
      answers.current.push({ qType: "match", skill: "vocab", correct: true });
      const f = new Set(found);
      f.add(hit.key);
      setFound(f);
      setSel([]);
      speakFr(hit.raw);
      if (f.size === cleaned.length) onExit(answers.current);
    } else if (letters.length >= Math.max(...cleaned.map((w) => w.key.length))) {
      setSel([]);
    }
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      <div
        className="grid gap-0.5"
        style={{ gridTemplateColumns: `repeat(${SIZE}, minmax(0,1fr))` }}
        role="group"
        aria-label="Letter grid — tap letters in order to spell a word"
      >
        {grid.map((row, r) =>
          row.map((ch, c) => {
            const isSel = sel.some(([rr, cc]) => rr === r && cc === c);
            return (
              <button
                key={`${r}-${c}`}
                type="button"
                onClick={() => tap(r, c)}
                className={`press aspect-square min-w-[26px] rounded font-mono text-xs font-bold sm:text-sm ${
                  isSel ? "bg-bleu text-white" : "bg-craie/50 hover:bg-craie"
                }`}
              >
                {ch}
              </button>
            );
          }),
        )}
      </div>
      <div className="min-w-[140px]">
        <p className="mb-2 font-mono text-xs text-ink2">
          Found {found.size}/{cleaned.length} · tap letters in order
        </p>
        <ul className="flex flex-col gap-1">
          {cleaned.map((w) => (
            <li
              key={w.key}
              lang="fr"
              className={`text-sm font-extrabold ${found.has(w.key) ? "text-menthe line-through" : ""}`}
            >
              {w.raw}
            </li>
          ))}
        </ul>
        {sel.length > 0 ? (
          <Button variant="soft" className="mt-3" onClick={() => setSel([])}>
            Clear selection
          </Button>
        ) : null}
      </div>
    </div>
  );
}

/* ============================ Crossword ============================ */

interface Slot {
  word: string; // deaccented uppercase
  raw: string;
  clue: string;
  row: number;
  col: number;
  across: boolean;
  n: number;
}

function buildCrossword(items: Item[]): { slots: Slot[]; rows: number; cols: number } {
  const words = sample(items, 10)
    .map((i) => ({
      raw: i.fr.replace(/^(le|la|les|l'|un|une|des)\s+/i, ""),
      clue: i.en,
    }))
    .map((w) => ({ ...w, key: deaccent(w.raw.toUpperCase()).replace(/[^A-Z]/g, "") }))
    .filter((w) => w.key.length >= 3 && w.key.length <= 12)
    .slice(0, 6)
    .sort((a, b) => b.key.length - a.key.length);
  const G = 15;
  const grid: (string | null)[][] = Array.from({ length: G }, () => Array(G).fill(null));
  const slots: Slot[] = [];

  function canPlace(w: string, r: number, c: number, across: boolean): boolean {
    if (across ? c + w.length > G : r + w.length > G) return false;
    for (let i = 0; i < w.length; i++) {
      const rr = across ? r : r + i;
      const cc = across ? c + i : c;
      const cell = grid[rr][cc];
      if (cell !== null && cell !== w[i]) return false;
    }
    return true;
  }
  function place(w: Omit<Slot, "row" | "col" | "across" | "n">, r: number, c: number, across: boolean) {
    for (let i = 0; i < w.word.length; i++) {
      const rr = across ? r : r + i;
      const cc = across ? c + i : c;
      grid[rr][cc] = w.word[i];
    }
    slots.push({ ...w, row: r, col: c, across, n: slots.length + 1 });
  }

  words.forEach((w, wi) => {
    const entry = { word: w.key, raw: w.raw, clue: w.clue };
    if (wi === 0) {
      place(entry, 7, Math.max(0, Math.floor((G - w.key.length) / 2)), true);
      return;
    }
    // try to cross an existing letter
    for (let i = 0; i < w.key.length; i++) {
      for (const s of slots) {
        for (let j = 0; j < s.word.length; j++) {
          if (s.word[j] !== w.key[i]) continue;
          const across = !s.across;
          const r = s.across ? s.row - i : s.row + j;
          const c = s.across ? s.col + j : s.col - i;
          if (r >= 0 && c >= 0 && canPlace(w.key, r, c, across)) {
            place(entry, r, c, across);
            return;
          }
        }
      }
    }
  });

  return { slots, rows: G, cols: G };
}

function Crossword({ items, onExit }: { items: Item[]; onExit: (a: PracticeAnswer[]) => void }) {
  const { slots, rows, cols } = useMemo(() => buildCrossword(items), [items]);
  const [solved, setSolved] = useState<Set<number>>(new Set());
  const [active, setActive] = useState<number>(slots[0]?.n ?? 1);
  const [input, setInput] = useState("");
  const answers = useRef<PracticeAnswer[]>([]);

  const cells = useMemo(() => {
    const m = new Map<string, { letter: string; slotNs: number[]; number?: number }>();
    for (const s of slots) {
      for (let i = 0; i < s.word.length; i++) {
        const r = s.across ? s.row : s.row + i;
        const c = s.across ? s.col + i : s.col;
        const k = `${r}-${c}`;
        const prev = m.get(k);
        m.set(k, {
          letter: s.word[i],
          slotNs: [...(prev?.slotNs ?? []), s.n],
          number: i === 0 ? s.n : prev?.number,
        });
      }
    }
    return m;
  }, [slots]);

  // trim to used bounding box
  const bounds = useMemo(() => {
    let rMin = rows, rMax = 0, cMin = cols, cMax = 0;
    for (const k of cells.keys()) {
      const [r, c] = k.split("-").map(Number);
      rMin = Math.min(rMin, r); rMax = Math.max(rMax, r);
      cMin = Math.min(cMin, c); cMax = Math.max(cMax, c);
    }
    return { rMin, rMax, cMin, cMax };
  }, [cells, rows, cols]);

  function submit() {
    const slot = slots.find((s) => s.n === active);
    if (!slot || solved.has(slot.n)) return;
    const guess = deaccent(normalize(input)).toUpperCase().replace(/[^A-Z]/g, "");
    const ok = guess === slot.word;
    answers.current.push({ qType: "fill", skill: "vocab", correct: ok });
    if (ok) {
      const next = new Set(solved);
      next.add(slot.n);
      setSolved(next);
      setInput("");
      speakFr(slot.raw);
      if (next.size === slots.length) onExit(answers.current);
      const remaining = slots.find((s) => !next.has(s.n));
      if (remaining) setActive(remaining.n);
    } else {
      setInput("");
    }
  }

  if (slots.length < 3)
    return <p className="text-ink2">Not enough crossable words yet — finish more lessons first.</p>;

  const activeSlot = slots.find((s) => s.n === active)!;

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <div
        className="grid gap-0.5"
        style={{ gridTemplateColumns: `repeat(${bounds.cMax - bounds.cMin + 1}, minmax(0,1fr))` }}
        aria-label="Crossword grid"
      >
        {Array.from({ length: bounds.rMax - bounds.rMin + 1 }, (_, ri) =>
          Array.from({ length: bounds.cMax - bounds.cMin + 1 }, (_, ci) => {
            const k = `${ri + bounds.rMin}-${ci + bounds.cMin}`;
            const cell = cells.get(k);
            if (!cell) return <span key={k} className="aspect-square min-w-[22px]" />;
            const inActive = cell.slotNs.includes(active);
            const revealed = cell.slotNs.some((n) => solved.has(n));
            return (
              <button
                key={k}
                type="button"
                onClick={() => setActive(cell.slotNs[0])}
                className={`press relative aspect-square min-w-[22px] rounded border font-mono text-xs font-bold sm:text-sm ${
                  inActive ? "border-bleu bg-bleu/10" : "border-craie bg-card"
                }`}
              >
                {cell.number ? (
                  <span className="absolute left-0 top-0 px-0.5 text-[8px] text-ink2">
                    {cell.number}
                  </span>
                ) : null}
                {revealed ? cell.letter : ""}
              </button>
            );
          }),
        )}
      </div>
      <div className="flex-1">
        <ul className="flex flex-col gap-1">
          {slots.map((s) => (
            <li key={s.n}>
              <button
                type="button"
                onClick={() => setActive(s.n)}
                className={`text-left text-sm ${
                  solved.has(s.n)
                    ? "text-menthe line-through"
                    : s.n === active
                      ? "font-extrabold text-bleu"
                      : "font-semibold"
                }`}
              >
                {s.n}. {s.across ? "→" : "↓"} {s.clue} ({s.word.length})
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            lang="fr"
            aria-label={`Answer for clue ${activeSlot.n}: ${activeSlot.clue}`}
            placeholder={`${activeSlot.clue}…`}
            className="h-11 flex-1 rounded-input border border-craie bg-card px-3.5"
          />
          <Button onClick={submit} disabled={!input.trim()}>
            Fill
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ============================ Page shell ============================ */

export default function ArcadePage() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [game, setGame] = useState<GameId | null>(null);
  const [summary, setSummary] = useState<{ correct: number; total: number; xp: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/practice/material")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Could not load vocabulary."))))
      .then((d: { items: Item[] }) => setItems(d.items))
      .catch((e: Error) => setError(e.message));
  }, []);

  async function finish(a: PracticeAnswer[]) {
    const xp = await logPractice("arcade", a);
    setSummary({ correct: a.filter((x) => x.correct).length, total: a.length, xp });
    setGame(null);
  }

  if (error)
    return (
      <p role="alert" className="font-semibold text-groseille">
        {error}
      </p>
    );
  if (!items) return <p className="font-mono text-sm text-ink2">Loading…</p>;
  if (items.length < 12)
    return (
      <p className="text-ink2">
        The arcade unlocks after a couple of lessons — it plays with words you have actually met.{" "}
        <Link href="/map" className="font-extrabold text-bleu hover:underline">
          Go learn some
        </Link>
      </p>
    );

  if (game) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold">
            {GAMES.find((g) => g.id === game)!.icon} {GAMES.find((g) => g.id === game)!.title}
          </h1>
          <Button variant="ghost" onClick={() => setGame(null)}>
            Quit game
          </Button>
        </div>
        <Card className="p-5">
          {game === "memory" ? <Memory items={items} onExit={finish} /> : null}
          {game === "speed" ? <Speed items={items} onExit={finish} /> : null}
          {game === "wordsearch" ? <WordSearch items={items} onExit={finish} /> : null}
          {game === "crossword" ? <Crossword items={items} onExit={finish} /> : null}
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl font-bold">Arcade</h1>
      <p className="mt-1 text-ink2">Games built from the words you have already met.</p>
      {summary ? (
        <Card className="banner-in mt-4 p-4">
          <p className="font-extrabold">
            Last game: {summary.correct}/{summary.total} · +{summary.xp} XP
          </p>
        </Card>
      ) : null}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {GAMES.map((g) => (
          <button key={g.id} type="button" onClick={() => setGame(g.id)} className="block text-left">
            <Card className="h-full p-5 transition-transform hover:-translate-y-0.5">
              <p className="text-3xl" aria-hidden="true">
                {g.icon}
              </p>
              <h2 className="mt-2 font-display text-xl font-bold">{g.title}</h2>
              <p className="mt-1 text-sm text-ink2">{g.desc}</p>
            </Card>
          </button>
        ))}
      </div>
    </div>
  );
}
