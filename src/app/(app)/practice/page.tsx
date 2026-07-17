import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireUserId } from "@/lib/session";
import { srsRepo } from "@/server/repo/srs.repo";
import { badgesRepo } from "@/server/repo/badges.repo";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Practice" };
export const dynamic = "force-dynamic";

const MODES = [
  {
    href: "/practice/review",
    icon: "🃏",
    title: "Review deck",
    desc: "Spaced repetition on words from your finished lessons.",
  },
  {
    href: "/practice/dictation",
    icon: "🎧",
    title: "Dictation",
    desc: "Hear a sentence, type it, get graded word by word.",
  },
  {
    href: "/practice/conjugation",
    icon: "🔀",
    title: "Conjugation",
    desc: "39 verbs across 6 tenses, from manger to falloir.",
  },
  {
    href: "/practice/numbers",
    icon: "🔢",
    title: "Numbers dash",
    desc: "quatre-vingt-dix-neuf and friends, at speed.",
  },
  {
    href: "/practice/arcade",
    icon: "🕹️",
    title: "Arcade",
    desc: "Memory, speed quiz, word search, crossword.",
  },
] as const;

export default async function PracticePage() {
  const userId = await requireUserId();
  if (!userId) redirect("/login");
  const { due, total } = srsRepo.counts(userId);
  const badges = badgesRepo.all(userId);
  const earned = badges.filter((b) => b.earned_at);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-3xl font-bold">Practice</h1>
        <p className="mt-1 text-ink2">
          {due > 0
            ? `${due} card${due === 1 ? "" : "s"} due for review — start there.`
            : total > 0
              ? "Deck is clear. Pick any drill below."
              : "Finish a lesson to start filling your review deck."}
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODES.map((m) => (
          <Link key={m.href} href={m.href} className="block">
            <Card className="h-full p-5 transition-transform hover:-translate-y-0.5">
              <p className="text-3xl" aria-hidden="true">
                {m.icon}
              </p>
              <h2 className="mt-2 font-display text-xl font-bold">
                {m.title}
                {m.href === "/practice/review" && due > 0 ? (
                  <span className="ml-2 rounded-full bg-groseille px-2 py-0.5 font-mono text-xs text-white">
                    {due}
                  </span>
                ) : null}
              </h2>
              <p className="mt-1 text-sm text-ink2">{m.desc}</p>
            </Card>
          </Link>
        ))}
      </div>

      <section>
        <h2 className="mb-3 font-display text-xl font-bold">
          Badges · {earned.length}/{badges.length}
        </h2>
        <Card className="grid grid-cols-3 gap-4 p-5 sm:grid-cols-4 lg:grid-cols-6">
          {badges.map((b) => (
            <div
              key={b.code}
              className={`text-center ${b.earned_at ? "" : "opacity-35 grayscale"}`}
              title={b.rule}
            >
              <p className="text-3xl" aria-hidden="true">
                {b.emoji}
              </p>
              <p className="mt-1 text-xs font-extrabold">{b.title}</p>
              <p className="font-mono text-[10px] text-ink2">{b.rule}</p>
            </div>
          ))}
        </Card>
      </section>
    </div>
  );
}
