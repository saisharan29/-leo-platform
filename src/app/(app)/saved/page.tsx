import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireUserId } from "@/lib/session";
import { contentRepo } from "@/server/repo/content.repo";
import { curriculumRepo } from "@/server/repo/curriculum.repo";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Saved" };
export const dynamic = "force-dynamic";

export default async function SavedPage() {
  const userId = await requireUserId();
  if (!userId) redirect("/login");
  const bookmarks = contentRepo.bookmarks(userId);
  const notes = contentRepo.notes(userId);
  const titleOf = (n: number) => curriculumRepo.lessonByNumber(n)?.title ?? "";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Saved</h1>
        <p className="mt-1 text-ink2">Your bookmarks and notes, in one place.</p>
      </div>

      <section>
        <h2 className="mb-3 font-display text-xl font-bold">🔖 Bookmarks</h2>
        {bookmarks.length === 0 ? (
          <p className="text-ink2">No bookmarks yet — the button lives at the top of every lesson.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {bookmarks.map((n) => (
              <li key={n}>
                <Link href={`/lesson/${n}`} className="block">
                  <Card className="p-3 text-sm font-extrabold transition-transform hover:-translate-y-0.5">
                    Lesson {n} · {titleOf(n)}
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-display text-xl font-bold">📝 Notes</h2>
        {notes.length === 0 ? (
          <p className="text-ink2">No notes yet — write one inside any lesson.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {notes.map((note) => (
              <li key={note.lesson_number}>
                <Link href={`/lesson/${note.lesson_number}`} className="block">
                  <Card className="p-4 transition-transform hover:-translate-y-0.5">
                    <p className="text-sm font-extrabold">
                      Lesson {note.lesson_number} · {titleOf(note.lesson_number)}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-ink2">{note.body}</p>
                    <p className="mt-1 font-mono text-[10px] text-ink2">updated {note.updated_at}</p>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
