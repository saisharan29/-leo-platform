import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireUserId } from "@/lib/session";
import { curriculumRepo } from "@/server/repo/curriculum.repo";
import { progressRepo } from "@/server/repo/progress.repo";
import { usersRepo } from "@/server/repo/users.repo";
import { unlockedThrough } from "@/lib/gamify";
import { LessonNode, type NodeState } from "@/components/domain/stats";

export const metadata: Metadata = { title: "Lessons" };
export const dynamic = "force-dynamic";

/** Horizontal offset pattern that makes the path snake left-right. */
const SNAKE = ["translate-x-0", "translate-x-10", "translate-x-16", "translate-x-10", "translate-x-0", "-translate-x-10", "-translate-x-16", "-translate-x-10"];

export default async function MapPage() {
  const userId = await requireUserId();
  if (!userId) redirect("/login");

  const modules = curriculumRepo.mapTree();
  const completed = new Set(progressRepo.completedNumbers(userId));
  const stars = progressRepo.starsByNumber(userId);
  const profile = usersRepo.profile(userId);
  const placement = (profile as unknown as { placement_unlock?: number })?.placement_unlock ?? 1;
  const current = Math.max(unlockedThrough([...completed]), placement);
  const doneCount = completed.size;

  let globalIndex = 0;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="pop-in flex items-center gap-4">
        <span className="float-y text-5xl" aria-hidden="true">{profile?.avatar ?? "🐓"}</span>
        <div>
          <h1 className="font-display text-3xl font-bold">Your path to C1</h1>
          <p className="mt-0.5 text-ink2">
            {doneCount === 0
              ? "84 stops. First one takes 15 minutes."
              : `${doneCount} of 84 done — the thread continues.`}
          </p>
        </div>
      </div>

      <div className="relative mt-10">
        {/* le fil rouge — the thread the path hangs from */}
        <div aria-hidden="true" className="absolute inset-y-0 left-1/2 w-1 -translate-x-1/2 rounded-full bg-bleu/15" />

        <div className="flex flex-col gap-12">
          {modules.map((mod) => (
            <section key={mod.sort} aria-labelledby={`mod-${mod.sort}`} className="relative">
              <h2
                id={`mod-${mod.sort}`}
                className="relative z-10 mx-auto mb-8 w-fit rounded-full border-2 border-bleu/20 bg-card px-5 py-2 text-center font-display text-base font-bold shadow-card"
              >
                <span className="mr-2 rounded-full bg-bleu px-2 py-0.5 font-mono text-xs text-white">{mod.level}</span>
                {mod.title}
              </h2>
              <ul className="relative z-10 flex flex-col items-center gap-9">
                {mod.lessons.map((l) => {
                  const state: NodeState = completed.has(l.number)
                    ? "done"
                    : l.number === current
                      ? "current"
                      : "locked";
                  const offset = SNAKE[globalIndex % SNAKE.length];
                  globalIndex += 1;
                  const node = (
                    <LessonNode number={l.number} title={l.title} state={state} stars={stars[l.number] ?? 0} />
                  );
                  return (
                    <li key={l.number} className={`${offset} transition-transform`}>
                      {state === "locked" ? (
                        <div className="opacity-80">{node}</div>
                      ) : (
                        <Link
                          href={`/lesson/${l.number}`}
                          className="block rounded-3xl transition-transform hover:scale-105"
                          aria-label={`${state === "done" ? "Review" : "Start"} lesson ${l.number}: ${l.title}`}
                        >
                          {node}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>

        <p className="relative z-10 mt-12 text-center text-4xl" aria-hidden="true">🏆</p>
        <p className="relative z-10 mt-1 text-center font-display font-bold">C1 — the summit</p>
      </div>
    </div>
  );
}
