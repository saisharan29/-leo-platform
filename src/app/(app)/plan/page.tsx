"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface Task {
  id: string; date: string; kind: string; title: string;
  minutes: number; xp: number; priority: number; status: string; sort: number;
}
interface MonthDay { date: string; total: number; done: number; missed: number }
interface HeatDay { date: string; xp: number; lessons: number }

const KIND_LINK: Record<string, string> = {
  lesson: "/map", review: "/practice/review", dictation: "/practice/dictation",
  conjugation: "/practice/conjugation", numbers: "/practice/numbers", arcade: "/practice/arcade",
};
const STATUS_META: Record<string, { icon: string; label: string }> = {
  todo: { icon: "⬜", label: "Not started" },
  doing: { icon: "🟡", label: "In progress" },
  done: { icon: "✅", label: "Done" },
  missed: { icon: "🔴", label: "Missed" },
  moved: { icon: "🔵", label: "Rescheduled" },
};

function todayParis(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());
}

export default function PlanPage() {
  const today = useMemo(todayParis, []);
  const [selDate, setSelDate] = useState(today);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [monthDays, setMonthDays] = useState<MonthDay[]>([]);
  const [heat, setHeat] = useState<HeatDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDay = useCallback(async (date: string) => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/plan?date=${date}`);
      if (!r.ok) throw new Error("Couldn't load the plan.");
      const data = (await r.json()) as { tasks: Task[] };
      setTasks(data.tasks);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMonth = useCallback(async (ym: string) => {
    const r = await fetch(`/api/calendar?month=${ym}`);
    if (r.ok) setMonthDays(((await r.json()) as { days: MonthDay[] }).days);
  }, []);

  useEffect(() => { loadDay(selDate); }, [selDate, loadDay]);
  useEffect(() => { loadMonth(month); }, [month, loadMonth]);
  useEffect(() => {
    fetch(`/api/calendar?year=${today.slice(0, 4)}`)
      .then((r) => (r.ok ? r.json() : { heatmap: [] }))
      .then((d: { heatmap?: HeatDay[] }) => setHeat(d.heatmap ?? []));
  }, [today]);

  async function setStatus(task: Task, status: string) {
    const prev = tasks;
    setTasks(tasks.map((t) => (t.id === task.id ? { ...t, status } : t)));
    const r = await fetch("/api/plan/task", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ taskId: task.id, status }),
    });
    if (!r.ok) setTasks(prev);
    else loadMonth(month);
  }

  /* ---- month grid ---- */
  const grid = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    const first = new Date(Date.UTC(y, m - 1, 1));
    const startPad = (first.getUTCDay() + 6) % 7; // Monday-first
    const daysIn = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const byDate = new Map(monthDays.map((d) => [d.date, d]));
    const cells: { date: string | null; info?: MonthDay }[] = [];
    for (let i = 0; i < startPad; i++) cells.push({ date: null });
    for (let d = 1; d <= daysIn; d++) {
      const date = `${month}-${String(d).padStart(2, "0")}`;
      cells.push({ date, info: byDate.get(date) });
    }
    return cells;
  }, [month, monthDays]);

  function dayColor(info?: MonthDay): string {
    if (!info || info.total === 0) return "bg-craie/40";
    if (info.missed > 0 && info.done === 0) return "bg-groseille/50";
    if (info.done === info.total) return "bg-menthe";
    if (info.done > 0) return "bg-brioche/70";
    return "bg-craie";
  }

  const doneCount = tasks.filter((t) => t.status === "done").length;
  const heatByDate = useMemo(() => new Map(heat.map((h) => [h.date, h])), [heat]);
  const yearCells = useMemo(() => {
    const y = Number(today.slice(0, 4));
    const out: { date: string; xp: number }[] = [];
    const d = new Date(Date.UTC(y, 0, 1));
    while (d.getUTCFullYear() === y) {
      const key = d.toISOString().slice(0, 10);
      out.push({ date: key, xp: heatByDate.get(key)?.xp ?? 0 });
      d.setUTCDate(d.getUTCDate() + 1);
    }
    return out;
  }, [today, heatByDate]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Study plan</h1>
        <p className="mt-1 text-ink2">
          Generated daily from your real progress: due reviews first, then your next lesson, then
          your weakest skills.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Day checklist */}
        <Card className="p-6">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-xl font-bold">
              {selDate === today ? "Today" : selDate}
            </h2>
            <span className="font-mono text-sm text-ink2">{doneCount}/{tasks.length} done</span>
          </div>
          {error ? <p role="alert" className="mt-3 text-sm font-semibold text-groseille">{error}</p> : null}
          {loading ? (
            <p className="mt-4 font-mono text-sm text-ink2">Loading…</p>
          ) : tasks.length === 0 ? (
            <p className="mt-4 text-ink2">
              {selDate < today ? "No plan was generated this day." : "Nothing planned — enjoy the rest."}
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-2">
              {tasks.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center gap-3 rounded-input border border-craie p-3">
                  <span aria-hidden="true" className="text-lg">{STATUS_META[t.status]?.icon ?? "⬜"}</span>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-extrabold ${t.status === "done" ? "line-through opacity-60" : ""}`}>
                      {t.title}
                    </p>
                    <p className="font-mono text-xs text-ink2">
                      {t.minutes} min · +{t.xp} XP · {STATUS_META[t.status]?.label}
                      {t.priority === 1 ? " · priority" : ""}
                    </p>
                  </div>
                  {selDate === today && t.status !== "done" ? (
                    <div className="flex gap-1.5">
                      <Link
                        href={KIND_LINK[t.kind] ?? "/practice"}
                        className="press rounded-input bg-craie/60 px-3 py-1.5 text-xs font-extrabold hover:bg-craie"
                      >
                        Open
                      </Link>
                      {t.status !== "doing" ? (
                        <Button variant="soft" className="!h-8 !px-3 !text-xs" onClick={() => setStatus(t, "doing")}>Start</Button>
                      ) : null}
                      <Button className="!h-8 !px-3 !text-xs" onClick={() => setStatus(t, "done")}>Done</Button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Month calendar */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <Button variant="ghost" aria-label="Previous month" onClick={() => {
              const [y, m] = month.split("-").map(Number);
              const d = new Date(Date.UTC(y, m - 2, 1));
              setMonth(d.toISOString().slice(0, 7));
            }}>←</Button>
            <h2 className="font-display text-lg font-bold">{month}</h2>
            <Button variant="ghost" aria-label="Next month" onClick={() => {
              const [y, m] = month.split("-").map(Number);
              const d = new Date(Date.UTC(y, m, 1));
              setMonth(d.toISOString().slice(0, 7));
            }}>→</Button>
          </div>
          <div className="mt-3 grid grid-cols-7 gap-1 text-center font-mono text-[10px] text-ink2">
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={i}>{d}</span>)}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {grid.map((c, i) =>
              c.date ? (
                <button
                  key={c.date}
                  type="button"
                  onClick={() => setSelDate(c.date!)}
                  aria-label={`View ${c.date}`}
                  className={`press flex h-9 items-center justify-center rounded-md text-xs font-extrabold ${dayColor(c.info)} ${
                    selDate === c.date ? "ring-2 ring-bleu" : ""
                  } ${c.date === today ? "outline outline-1 outline-ink/30" : ""}`}
                >
                  {Number(c.date.slice(-2))}
                </button>
              ) : (
                <span key={`pad${i}`} />
              ),
            )}
          </div>
          <p className="mt-3 font-mono text-[10px] text-ink2">
            🟩 all done · 🟨 partial · 🟥 missed · grey no plan
          </p>
        </Card>
      </div>

      {/* Yearly heatmap */}
      <Card className="overflow-x-auto p-6">
        <h2 className="font-display text-xl font-bold">Consistency · {today.slice(0, 4)}</h2>
        <div className="mt-4 grid w-max grid-flow-col grid-rows-7 gap-[3px]" aria-label="Yearly study heatmap">
          {yearCells.map((c) => (
            <span
              key={c.date}
              title={`${c.date}: ${c.xp} XP`}
              className={`h-3 w-3 rounded-sm ${
                c.xp === 0 ? "bg-craie/50" : c.xp < 30 ? "bg-menthe/30" : c.xp < 60 ? "bg-menthe/60" : "bg-menthe"
              } ${c.date > today ? "opacity-30" : ""}`}
            />
          ))}
        </div>
        <p className="mt-3 font-mono text-xs text-ink2">Each square is a day; greener = more XP.</p>
      </Card>
    </div>
  );
}
