// Pure engine types — no framework imports allowed in this folder.

export type Skill = "speaking" | "listening" | "reading" | "writing" | "vocab" | "grammar";

export interface VocabEntry {
  fr: string;
  en: string;
  pron: string;
  exampleFr: string;
  exampleEn: string;
  examplePron: string;
}

export interface GrammarExample { fr: string; en: string; pron: string }
export interface DialogueLine { speaker: string; fr: string; en: string; pron: string }

export interface LessonContent {
  number: number;
  level: "A1" | "A2" | "B1" | "B2" | "C1";
  title: string;
  objective: string;
  grammar: { title: string; body: string[]; examples: GrammarExample[] };
  vocab: VocabEntry[];
  dialogue: { scene: string; lines: DialogueLine[] };
  videoQuery: string;
  writingPrompt: string;
}

export type QType = "mcq" | "fill" | "match" | "order" | "listen" | "type" | "speak";

interface QBase {
  id: string;
  type: QType;
  skill: Skill;
  kicker: string;
  explain: string;
}

export interface McqQ extends QBase { type: "mcq"; prompt: string; say?: string; options: string[]; answer: string }
export interface ListenQ extends QBase { type: "listen"; say: string; options: string[]; answer: string }
export interface FillQ extends QBase { type: "fill"; prompt: string; accept: string[]; answerShown: string }
export interface TypeQ extends QBase { type: "type"; prompt: string; accept: string[]; answerShown: string }
export interface MatchQ extends QBase { type: "match"; pairs: [string, string][] }
export interface OrderQ extends QBase { type: "order"; translation: string; answer: string; bank: string[] }
export interface SpeakQ extends QBase { type: "speak"; target: string; pron: string; en: string }

export type Question = McqQ | ListenQ | FillQ | TypeQ | MatchQ | OrderQ | SpeakQ;
