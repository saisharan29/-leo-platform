"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function LessonExtras({
  lessonNumber,
  videoQuery,
  videos,
}: {
  lessonNumber: number;
  videoQuery: string;
  videos: { id: string; title: string; youtube_id: string }[];
}) {
  const [bookmarked, setBookmarked] = useState<boolean | null>(null);
  const [note, setNote] = useState("");
  const [savedNote, setSavedNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [dl, setDl] = useState<"idle" | "unsupported" | "working" | "done" | "failed">("idle");
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    if (!("serviceWorker" in navigator)) setDl("unsupported");
    else {
      const onMsg = (e: MessageEvent) => {
        if (e.data?.type === "LESSON_CACHED" && e.data.number === lessonNumber)
          setDl(e.data.ok ? "done" : "failed");
      };
      navigator.serviceWorker.addEventListener("message", onMsg);
    }
    fetch("/api/bookmarks").then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (d) setBookmarked((d.bookmarks as number[]).includes(lessonNumber));
    });
    fetch(`/api/notes?lesson=${lessonNumber}`).then((r) => (r.ok ? r.json() : null)).then((d) => {
      const body = d?.note?.body ?? "";
      setNote(body);
      setSavedNote(body);
    });
  }, [lessonNumber]);

  async function toggleBookmark() {
    const r = await fetch("/api/bookmarks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lessonNumber }),
    });
    if (r.ok) setBookmarked(((await r.json()) as { bookmarked: boolean }).bookmarked);
  }

  async function downloadPack() {
    const reg = await navigator.serviceWorker.getRegistration();
    const target = reg?.active;
    if (!target) { setDl("failed"); return; }
    setDl("working");
    target.postMessage({ type: "CACHE_LESSON", number: lessonNumber });
  }

  async function saveNote() {
    setSaving(true);
    const r = await fetch("/api/notes", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lessonNumber, body: note }),
    });
    setSaving(false);
    if (r.ok) setSavedNote(note);
  }

  return (
    <>
      <div className="flex flex-wrap justify-end gap-2">
        {dl !== "unsupported" ? (
          <Button variant="soft" onClick={downloadPack} disabled={dl === "working" || dl === "done"}>
            {dl === "done" ? "📥 Available offline" : dl === "working" ? "Downloading…" : dl === "failed" ? "Retry download" : "📥 Download for offline"}
          </Button>
        ) : null}
        <Button variant="soft" onClick={toggleBookmark} disabled={bookmarked === null}>
          {bookmarked ? "🔖 Bookmarked" : "🔖 Bookmark this lesson"}
        </Button>
      </div>

      {videos.length > 0 ? (
        <Card className="p-6">
          <h2 className="font-display text-xl font-bold">Videos</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {videos.map((v) => (
              <figure key={v.id}>
                <div className="aspect-video overflow-hidden rounded-input border border-craie">
                  <iframe
                    title={v.title}
                    src={`https://www.youtube-nocookie.com/embed/${v.youtube_id}`}
                    className="h-full w-full"
                    allow="accelerometer; encrypted-media; picture-in-picture"
                    allowFullScreen
                    loading="lazy"
                  />
                </div>
                <figcaption className="mt-1 text-sm font-extrabold">{v.title}</figcaption>
              </figure>
            ))}
          </div>
        </Card>
      ) : (
        <Card className="p-6">
          <h2 className="font-display text-xl font-bold">Videos</h2>
          <p className="mt-2 text-sm text-ink2">
            No curated videos for this lesson yet. Good real-teacher videos exist on YouTube — search:
          </p>
          <a
            href={`https://www.youtube.com/results?search_query=${encodeURIComponent(videoQuery)}`}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block font-extrabold text-bleu hover:underline"
          >
            “{videoQuery}” on YouTube →
          </a>
        </Card>
      )}

      <Card className="p-6">
        <h2 className="font-display text-xl font-bold">My notes</h2>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          placeholder="Anything you want to remember from this lesson…"
          aria-label={`Notes for lesson ${lessonNumber}`}
          className="mt-3 w-full resize-y rounded-input border border-craie bg-card p-3 text-sm"
        />
        <div className="mt-2 flex items-center gap-3">
          <Button onClick={saveNote} disabled={saving || note === savedNote}>
            {saving ? "Saving…" : note === savedNote ? "Saved" : "Save note"}
          </Button>
          {note !== savedNote ? <span className="font-mono text-xs text-ink2">unsaved changes</span> : null}
        </div>
      </Card>
    </>
  );
}
