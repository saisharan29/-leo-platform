// Exercise generator: ≥25 questions per lesson, deterministic for a given seed.
import type { LessonContent, Question, McqQ, ListenQ, FillQ, TypeQ, MatchQ, OrderQ, SpeakQ, VocabEntry } from "./types";
import { mulberry32, shuffle, pick, type Rng } from "./rng";
import { normalize, deaccent } from "./text";

const stripArticle = (s: string) =>
  s.replace(/^(le |la |les |l'|un |une |des |to )/i, "").trim();

function acceptedAnswers(primary: string): string[] {
  const n = normalize(primary);
  const out = new Set<string>([n, deaccent(n), normalize(stripArticle(primary)), deaccent(normalize(stripArticle(primary)))]);
  // allow first variant before slash/paren: "hello / good day" → "hello"
  const first = n.split(/[/(]/)[0].trim();
  if (first) { out.add(first); out.add(deaccent(first)); }
  return [...out].filter(Boolean);
}

function distractors(correct: string, pool: string[], rng: Rng, n = 3): string[] {
  const others = shuffle(pool.filter(x => x !== correct && normalize(x) !== normalize(correct)), rng);
  const seen = new Set<string>([normalize(correct)]);
  const out: string[] = [];
  for (const o of others) {
    if (out.length >= n) break;
    if (!seen.has(normalize(o))) { seen.add(normalize(o)); out.push(o); }
  }
  return out;
}

let qCounter = 0;
const qid = (t: string) => `${t}-${++qCounter}`;

export function generateExercises(lesson: LessonContent, seed = 1): Question[] {
  qCounter = 0;
  const rng = mulberry32(seed * 1_000_003 + lesson.number);
  const v = lesson.vocab;
  const frPool = v.map(w => w.fr);
  const enPool = v.map(w => w.en);
  const qs: Question[] = [];

  // 1 · MCQ fr→en for 6 words
  for (const w of shuffle(v, rng).slice(0, 6)) {
    const options = shuffle([w.en, ...distractors(w.en, enPool, rng)], rng);
    qs.push(<McqQ>{
      id: qid("mcq"), type: "mcq", skill: "vocab", kicker: "Vocabulary",
      prompt: `What does “${w.fr}” mean?`, say: w.fr, options, answer: w.en,
      explain: `“${w.fr}” (${w.pron}) means “${w.en}”. Example: ${w.exampleFr} — ${w.exampleEn}`,
    });
  }

  // 2 · MCQ en→fr for 5 words
  for (const w of shuffle(v, rng).slice(0, 5)) {
    const options = shuffle([w.fr, ...distractors(w.fr, frPool, rng)], rng);
    qs.push(<McqQ>{
      id: qid("mcq"), type: "mcq", skill: "vocab", kicker: "Translate",
      prompt: `How do you say “${w.en}” in French?`, options, answer: w.fr,
      explain: `“${w.en}” is “${w.fr}” (${w.pron}).`,
    });
  }

  // 3 · Fill-in-the-blank from example sentences (5)
  const withExamples = v.filter(w => w.exampleFr && new RegExp(escapeReg(w.fr), "i").test(w.exampleFr));
  for (const w of shuffle(withExamples, rng).slice(0, 5)) {
    const blanked = w.exampleFr.replace(new RegExp(escapeReg(w.fr), "i"), "_____");
    qs.push(<FillQ>{
      id: qid("fill"), type: "fill", skill: "grammar", kicker: "Fill the blank",
      prompt: `${blanked}\n(${w.exampleEn})`, accept: acceptedAnswers(w.fr), answerShown: w.fr,
      explain: `The missing word is “${w.fr}” — ${w.en}. Full sentence: ${w.exampleFr}`,
    });
  }

  // 4 · One match set of 6 pairs
  const pairsSrc = shuffle(v, rng).slice(0, 6);
  qs.push(<MatchQ>{
    id: qid("match"), type: "match", skill: "vocab", kicker: "Match the pairs",
    pairs: pairsSrc.map(w => [w.fr, w.en] as [string, string]),
    explain: pairsSrc.map(w => `${w.fr} = ${w.en}`).join(" · "),
  });

  // 5 · Order (rebuild sentence) from dialogue lines 3–8 words (3)
  const buildable = lesson.dialogue.lines.filter(l => {
    const n = l.fr.split(" ").length; return n >= 3 && n <= 8;
  });
  for (const line of shuffle(buildable, rng).slice(0, 3)) {
    const answer = line.fr.replace(/\s+([?!.,])/g, " $1");
    qs.push(<OrderQ>{
      id: qid("order"), type: "order", skill: "reading", kicker: "Build the sentence",
      translation: line.en, answer, bank: shuffle(answer.split(" "), rng),
      explain: `“${answer}” — ${line.en}`,
    });
  }

  // 6 · Listening: hear FR, choose EN (4)
  for (const w of shuffle(v, rng).slice(0, 4)) {
    const options = shuffle([w.en, ...distractors(w.en, enPool, rng)], rng);
    qs.push(<ListenQ>{
      id: qid("listen"), type: "listen", skill: "listening", kicker: "Listening",
      say: w.fr, options, answer: w.en,
      explain: `You heard “${w.fr}” (${w.pron}) — “${w.en}”.`,
    });
  }

  // 7 · Type the translation en→fr (3)
  for (const w of shuffle(v, rng).slice(0, 3)) {
    qs.push(<TypeQ>{
      id: qid("type"), type: "type", skill: "writing", kicker: "Type it in French",
      prompt: `“${w.en}”`, accept: acceptedAnswers(w.fr), answerShown: w.fr,
      explain: `“${w.en}” → “${w.fr}” (${w.pron}). Accents matter in real writing — we accept both while you learn.`,
    });
  }

  // 8 · Speaking (3)
  for (const w of shuffle(v, rng).slice(0, 3)) {
    qs.push(<SpeakQ>{
      id: qid("speak"), type: "speak", skill: "speaking", kicker: "Say it out loud",
      target: w.exampleFr || w.fr, pron: w.examplePron || w.pron, en: w.exampleEn || w.en,
      explain: `Target: “${w.exampleFr || w.fr}”. We check the words you said (not your accent) — repeat after the audio for rhythm.`,
    });
  }

  // 9 · Grammar MCQ from grammar examples (up to 3)
  for (const ex of shuffle(lesson.grammar.examples, rng).slice(0, 3)) {
    const pool = lesson.grammar.examples.map(e => e.en);
    if (pool.length < 2) break;
    const options = shuffle([ex.en, ...distractors(ex.en, pool.concat(enPool), rng)], rng);
    qs.push(<McqQ>{
      id: qid("mcq"), type: "mcq", skill: "grammar", kicker: lesson.grammar.title,
      prompt: `What does “${ex.fr}” mean?`, say: ex.fr, options, answer: ex.en,
      explain: `${ex.fr} (${ex.pron}) — ${ex.en}. Rule: ${lesson.grammar.title}.`,
    });
  }

  // 10 · Reading comprehension from dialogue (2)
  const dlgFr = lesson.dialogue.lines.map(l => l.fr);
  for (const line of shuffle(lesson.dialogue.lines, rng).slice(0, 2)) {
    const options = shuffle([line.fr, ...distractors(line.fr, dlgFr.concat(frPool), rng)], rng);
    qs.push(<McqQ>{
      id: qid("mcq"), type: "mcq", skill: "reading", kicker: `Reading · ${lesson.dialogue.scene}`,
      prompt: `In the dialogue, how do you say: “${line.en}”?`, options, answer: line.fr,
      explain: `${line.speaker} says: “${line.fr}” — ${line.en}`,
    });
  }

  return shuffle(qs, rng);
}

function escapeReg(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Grade helpers used by client + tests */
export function isFillCorrect(q: { accept: string[] }, input: string): boolean {
  const n = normalize(input);
  return q.accept.includes(n) || q.accept.includes(deaccent(n));
}
export function isOrderCorrect(q: { answer: string }, tokens: string[]): boolean {
  return normalize(tokens.join(" ")) === normalize(q.answer);
}
export function speakWordMatch(target: string, said: string): number {
  const tw = normalize(deaccent(target)).split(" ").filter(Boolean);
  const sw = new Set(normalize(deaccent(said)).split(" "));
  if (!tw.length) return 0;
  return tw.filter(w => sw.has(w)).length / tw.length;
}
