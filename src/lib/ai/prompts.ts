// AI tutor prompt builders. Pure functions — unit tested in phase3.test.ts.
// Policy: the tutor teaches, it never just hands over graded-exercise answers,
// and it never invents "pronunciation scores".

export type TutorMode =
  | "chat"
  | "roleplay"
  | "writing"
  | "interview";

export const ROLEPLAY_SCENES = [
  "restaurant",
  "shopping",
  "doctor",
  "university",
  "office",
  "travel",
  "hotel",
  "bank",
  "apartment",
  "phone",
] as const;
export type RoleplayScene = (typeof ROLEPLAY_SCENES)[number];

export interface MemoryPack {
  displayName: string;
  cefr: string; // best-effort current level from progress
  lessonsDone: number;
  weakSkills: { skill: string; pct: number }[]; // worst first, only <75%
  weakWords: { fr: string; en: string }[]; // lapsed SRS cards / recent misses
  streak: number;
}

const BASE_RULES = `You are Léo, a warm, rigorous French tutor inside a learning app.
Rules you always follow:
- Match the learner's level (given below). Use French they can handle, glossing new words in English.
- Correct mistakes briefly and kindly: quote the error, give the fix, one-line why.
- Never complete the learner's graded exercises for them; coach them to the answer instead.
- Never claim to score pronunciation or accents — you only see text.
- Keep replies short (under 150 words) unless asked to elaborate.`;

export function memoryBlock(m: MemoryPack): string {
  const skills = m.weakSkills.length
    ? m.weakSkills.map((s) => `${s.skill} ${s.pct}%`).join(", ")
    : "none flagged yet";
  const words = m.weakWords.length
    ? m.weakWords.slice(0, 12).map((w) => `${w.fr} (${w.en})`).join("; ")
    : "none yet";
  return `Learner: ${m.displayName} · level ~${m.cefr} · ${m.lessonsDone}/84 lessons · streak ${m.streak}d
Weak skills: ${skills}
Words they keep missing (weave these into practice naturally): ${words}`;
}

export function buildSystemPrompt(mode: TutorMode, memory: MemoryPack, scene?: RoleplayScene): string {
  const mem = memoryBlock(memory);
  switch (mode) {
    case "chat":
      return `${BASE_RULES}\n\n${mem}\n\nMode: open conversation. Answer questions about French, explain grammar with examples, and gently steer practice toward the learner's weak areas.`;
    case "roleplay": {
      const s = scene ?? "restaurant";
      return `${BASE_RULES}\n\n${mem}\n\nMode: roleplay — scene: ${s}. Stay in character as the French-speaking counterpart (waiter, doctor, banker…). Speak French at the learner's level; after each of your turns add a one-line English gloss in parentheses. If the learner is stuck, offer two example replies they could use.`;
    }
    case "writing":
      return `${BASE_RULES}\n\n${mem}\n\nMode: writing coach. The learner submits French text. Respond with: (1) overall impression in one sentence, (2) corrections as a list "wrote → fix — why", (3) one rewritten model version at their level, (4) a /20 DELF-style mark with one-line justification. Be specific, never vague praise.`;
    case "interview":
      return `${BASE_RULES}\n\n${mem}\n\nMode: job-interview simulator. You are a French hiring manager. Ask one interview question at a time in French (with an English gloss). After each learner answer: give brief feedback on language and content, then ask the next question. Increase difficulty gradually.`;
  }
}

/** Daily per-user call quota. Swap to Redis in production (ADR-002). */
export const AI_DAILY_QUOTA = 50;
