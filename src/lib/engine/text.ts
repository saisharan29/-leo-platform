// Text normalisation helpers shared by graders.
export const normalize = (s: string): string =>
  s.toLowerCase().replace(/’/g, "'").replace(/[.,!?;:«»"()\u2026]/g, " ").replace(/\s+/g, " ").trim();

export const deaccent = (s: string): string =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export const softEquals = (a: string, b: string): boolean =>
  deaccent(normalize(a)) === deaccent(normalize(b));

/** Word-level diff for dictation: returns per-target-word hit flags. */
export function wordDiff(target: string, attempt: string): { word: string; ok: boolean }[] {
  const tw = target.split(/\s+/).filter((w) => /[a-zà-ÿœ0-9]/i.test(w));
  const uw = attempt.split(/\s+/).map((w) => deaccent(normalize(w)));
  return tw.map((w, i) => ({ word: w, ok: deaccent(normalize(w)) === (uw[i] ?? "") }));
}
