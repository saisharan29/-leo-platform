"use client";

// Shared browser helpers for practice screens.

export function speakFr(text: string, rate = 0.95) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "fr-FR";
  u.rate = rate;
  const fr = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith("fr"));
  if (fr) u.voice = fr;
  window.speechSynthesis.speak(u);
}

export interface PracticeAnswer {
  qType: "mcq" | "fill" | "match" | "order" | "listen" | "type" | "speak";
  skill: "speaking" | "listening" | "reading" | "writing" | "vocab" | "grammar";
  correct: boolean;
}

/** Fire-and-forget practice logging; returns granted XP (0 on failure). */
export async function logPractice(
  kind: "review" | "dictation" | "conjugation" | "numbers" | "arcade",
  answers: PracticeAnswer[],
): Promise<number> {
  if (answers.length === 0) return 0;
  try {
    const res = await fetch("/api/practice/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, answers, xp: answers.filter((a) => a.correct).length }),
    });
    if (!res.ok) return 0;
    const data = (await res.json()) as { xp: number };
    return data.xp;
  } catch {
    return 0;
  }
}
