"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface Vocab { idx: number; fr: string; en: string; pron: string }
interface LessonData {
  number: number; title: string; objective: string;
  vocab: Vocab[];
  videos: { id: string; title: string; youtube_id: string }[];
}

export default function AdminPage() {
  const [lessonN, setLessonN] = useState("1");
  const [data, setData] = useState<LessonData | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [objective, setObjective] = useState("");
  const [vTitle, setVTitle] = useState("");
  const [vId, setVId] = useState("");

  const load = useCallback(async (n: string) => {
    setMsg(null);
    const r = await fetch(`/api/admin/lesson?number=${n}`);
    if (r.status === 403) { setForbidden(true); return; }
    if (!r.ok) { setMsg(`Lesson ${n} not found.`); setData(null); return; }
    const d = (await r.json()) as LessonData;
    setData(d);
    setTitle(d.title);
    setObjective(d.objective);
  }, []);

  useEffect(() => { load("1"); }, [load]);

  async function op(body: Record<string, unknown>, okMsg: string) {
    setMsg(null);
    const r = await fetch("/api/admin/content", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (r.status === 403) { setForbidden(true); return; }
    const d = (await r.json()) as { ok?: boolean; error?: { message?: string } };
    setMsg(r.ok ? okMsg : d.error?.message ?? "Failed.");
    if (r.ok && data) load(String(data.number));
  }

  if (forbidden) {
    return (
      <Card className="mx-auto max-w-lg p-8 text-center">
        <h1 className="font-display text-2xl font-bold">Admin only</h1>
        <p className="mt-2 text-ink2">
          This area needs the admin role. Grant it with:{" "}
          <code className="font-mono text-sm">node scripts/make-admin.mjs your@email</code>
        </p>
      </Card>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Content admin</h1>
        <p className="mt-1 text-ink2">Edit lesson text, vocabulary, and curated videos. Search reindexes automatically.</p>
      </div>

      <div className="flex items-end gap-2">
        <Input label="Lesson number" type="number" min={1} max={84} value={lessonN} onChange={(e) => setLessonN(e.target.value)} />
        <Button onClick={() => load(lessonN)}>Load</Button>
      </div>

      {msg ? <p role="status" className="rounded-input bg-craie/50 p-3 text-sm font-semibold">{msg}</p> : null}

      {data ? (
        <>
          <Card className="flex flex-col gap-4 p-6">
            <h2 className="font-display text-xl font-bold">Lesson {data.number} text</h2>
            <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="obj" className="text-sm font-extrabold">Objective</label>
              <textarea id="obj" value={objective} onChange={(e) => setObjective(e.target.value)} rows={3}
                className="rounded-input border border-craie bg-card p-3 text-sm" />
            </div>
            <div>
              <Button onClick={() => op({ op: "lesson", lessonNumber: data.number, title, objective }, "Lesson text saved.")}>
                Save lesson text
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="font-display text-xl font-bold">Vocabulary</h2>
            <ul className="mt-4 flex flex-col gap-3">
              {data.vocab.map((v) => (
                <VocabEditor key={v.idx} v={v} onSave={(patch) => op({ op: "vocab", lessonNumber: data.number, idx: v.idx, ...patch }, `Word ${v.idx + 1} saved.`)} />
              ))}
            </ul>
          </Card>

          <Card className="p-6">
            <h2 className="font-display text-xl font-bold">Curated videos</h2>
            {data.videos.length === 0 ? <p className="mt-2 text-sm text-ink2">None yet — learners see a YouTube search link instead.</p> : (
              <ul className="mt-3 flex flex-col gap-2">
                {data.videos.map((v) => (
                  <li key={v.id} className="flex items-center gap-3 rounded-input border border-craie p-2.5 text-sm">
                    <span className="flex-1 font-extrabold">{v.title}</span>
                    <code className="font-mono text-xs text-ink2">{v.youtube_id}</code>
                    <Button variant="danger" className="!h-8 !px-3 !text-xs" onClick={() => op({ op: "video_del", id: v.id }, "Video removed.")}>
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 flex flex-wrap items-end gap-2">
              <Input label="Video title" value={vTitle} onChange={(e) => setVTitle(e.target.value)} />
              <Input label="YouTube ID" value={vId} onChange={(e) => setVId(e.target.value)} placeholder="dQw4w9WgXcQ" />
              <Button
                disabled={!vTitle.trim() || !/^[\w-]{6,20}$/.test(vId)}
                onClick={() => { op({ op: "video_add", lessonNumber: data.number, title: vTitle.trim(), youtubeId: vId }, "Video added."); setVTitle(""); setVId(""); }}
              >
                Add video
              </Button>
            </div>
          </Card>
        </>
      ) : null}
    </div>
  );
}

function VocabEditor({ v, onSave }: { v: Vocab; onSave: (patch: Partial<Vocab>) => void }) {
  const [fr, setFr] = useState(v.fr);
  const [en, setEn] = useState(v.en);
  const [pron, setPron] = useState(v.pron);
  const dirty = fr !== v.fr || en !== v.en || pron !== v.pron;
  return (
    <li className="grid items-end gap-2 rounded-input border border-craie p-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
      <Input label={`French (word ${v.idx + 1})`} value={fr} onChange={(e) => setFr(e.target.value)} />
      <Input label="English" value={en} onChange={(e) => setEn(e.target.value)} />
      <Input label="Pronunciation" value={pron} onChange={(e) => setPron(e.target.value)} />
      <Button variant={dirty ? "primary" : "soft"} disabled={!dirty} onClick={() => onSave({ fr, en, pron })}>
        Save
      </Button>
    </li>
  );
}
