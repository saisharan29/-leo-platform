"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * User-selectable mascots. All are plain Unicode emoji rendered by the
 * user's own device — no third-party artwork is shipped, so there is
 * nothing to license. The rooster leads: it's the national symbol of France.
 */
export const MASCOTS: { emoji: string; name: string; blurb: string }[] = [
  { emoji: "🐓", name: "Le Coq", blurb: "The symbol of France itself" },
  { emoji: "🥐", name: "Croissant", blurb: "Buttery. Flaky. Motivated." },
  { emoji: "🐸", name: "La Grenouille", blurb: "Petit but mighty" },
  { emoji: "🐱", name: "Le Chat", blurb: "Naps between lessons" },
  { emoji: "🐧", name: "Le Pingouin", blurb: "Dressed for the DELF exam" },
  { emoji: "🦁", name: "Le Lion", blurb: "Roars in the subjunctive" },
  { emoji: "🐻", name: "L'Ours", blurb: "Strong and steady streaks" },
  { emoji: "🦊", name: "Le Renard", blurb: "The clever classic" },
  { emoji: "🐢", name: "La Tortue", blurb: "Slow, unstoppable progress" },
  { emoji: "🦄", name: "La Licorne", blurb: "Believes in your C1 dreams" },
  { emoji: "🥖", name: "La Baguette", blurb: "Crusty on the outside only" },
  { emoji: "🐙", name: "Le Poulpe", blurb: "Eight arms, all taking notes" },
];

export function MascotPicker({
  current,
  open,
  onClose,
}: {
  current: string;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState(current);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setSelected(current);
  }, [open, current]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const r = await fetch("/api/me", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ avatar: selected }),
      });
      if (!r.ok) throw new Error("Couldn't save your mascot. Try again.");
      onClose();
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="mascot-title"
    >
      <div
        ref={dialogRef}
        className="pop-in w-full max-w-md rounded-card border-2 border-craie bg-card p-6 shadow-card"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="mascot-title" className="font-display text-2xl font-bold">
              Choose your companion
            </h2>
            <p className="mt-0.5 text-sm text-ink2">It cheers you on. Choose wisely.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="press rounded-full p-1.5 text-ink2 hover:bg-craie/50"
          >
            ✕
          </button>
        </div>

        <div className="stagger mt-5 grid grid-cols-4 gap-2.5">
          {MASCOTS.map((m) => (
            <button
              key={m.emoji}
              type="button"
              onClick={() => setSelected(m.emoji)}
              aria-pressed={selected === m.emoji}
              title={`${m.name} — ${m.blurb}`}
              className={`chunky flex aspect-square flex-col items-center justify-center gap-0.5 rounded-card border-2 bg-paper text-3xl transition-colors ${
                selected === m.emoji
                  ? "border-bleu bg-bleu/10 ring-2 ring-bleu/30"
                  : "border-craie hover:border-bleu/40"
              }`}
            >
              <span aria-hidden="true">{m.emoji}</span>
              <span className="px-1 text-center font-mono text-[9px] leading-tight text-ink2">
                {m.name}
              </span>
            </button>
          ))}
        </div>

        <p className="mt-4 min-h-5 text-center text-sm font-extrabold" aria-live="polite">
          {MASCOTS.find((m) => m.emoji === selected)?.blurb ?? ""}
        </p>

        {error ? (
          <p role="alert" className="mt-2 text-center text-sm font-semibold text-groseille">
            {error}
          </p>
        ) : null}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="chunky rounded-input bg-craie/70 px-5 py-2.5 font-extrabold"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || selected === current}
            className="chunky chunky-bleu rounded-input bg-bleu px-5 py-2.5 font-extrabold text-white disabled:opacity-50"
          >
            {saving ? "Saving…" : `Adopt ${MASCOTS.find((m) => m.emoji === selected)?.name ?? ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
