"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SkillBar } from "@/components/domain/stats";

interface Report {
  range: string; from: string; to: string;
  days: { date: string; xp: number; minutes: number; lessons: number; correct: number; answered: number }[];
  totals: { xp: number; minutes: number; lessons: number; correct: number; answered: number };
  skills: { skill: string; pct: number; n: number }[];
  activeDays: number;
}
interface LeaderEntry { name: string; avatar: string; xp: number }

export default function ReportsPage() {
  const [range, setRange] = useState<"week" | "month">("week");
  const [report, setReport] = useState<Report | null>(null);
  const [leaders, setLeaders] = useState<LeaderEntry[] | null>(null);
  const [optedIn, setOptedIn] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (r: "week" | "month") => {
    setError(null);
    const res = await fetch(`/api/reports?range=${r}`);
    if (!res.ok) { setError("Couldn't load the report."); return; }
    setReport((await res.json()) as Report);
  }, []);

  useEffect(() => { load(range); }, [range, load]);
  useEffect(() => {
    fetch("/api/leaderboard").then((r) => (r.ok ? r.json() : null)).then((d) => d && setLeaders(d.entries));
    fetch("/api/me").then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (d && typeof d.leaderboardOptIn === "boolean") setOptedIn(d.leaderboardOptIn);
      else setOptedIn(false);
    });
  }, []);

  async function toggleOptIn() {
    const next = !optedIn;
    setOptedIn(next);
    const r = await fetch("/api/me", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ leaderboardOptIn: next }),
    });
    if (!r.ok) setOptedIn(!next);
    else fetch("/api/leaderboard").then((x) => x.ok && x.json()).then((d) => d && setLeaders(d.entries));
  }

  const accuracy = report && report.totals.answered
    ? Math.round((report.totals.correct / report.totals.answered) * 100) : null;

  const weakest = report?.skills.filter((s) => s.n >= 5).sort((a, b) => a.pct - b.pct)[0];
  const strongest = report?.skills.filter((s) => s.n >= 5).sort((a, b) => b.pct - a.pct)[0];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="font-display text-3xl font-bold">Reports</h1>
        <div className="flex gap-1 rounded-full border border-craie bg-card p-1" role="radiogroup" aria-label="Report range">
          {(["week", "month"] as const).map((r) => (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={range === r}
              onClick={() => setRange(r)}
              className={`press rounded-full px-4 py-1.5 text-sm font-extrabold ${
                range === r ? "bg-bleu text-white" : "text-ink2"
              }`}
            >
              {r === "week" ? "Last 7 days" : "Last 30 days"}
            </button>
          ))}
        </div>
      </div>

      {error ? <p role="alert" className="text-sm font-semibold text-groseille">{error}</p> : null}

      {report ? (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Card className="p-4"><p className="text-sm font-extrabold text-ink2">⚡ XP earned</p><p className="mt-1 font-display text-3xl font-bold">{report.totals.xp}</p></Card>
            <Card className="p-4"><p className="text-sm font-extrabold text-ink2">📘 Lessons</p><p className="mt-1 font-display text-3xl font-bold">{report.totals.lessons}</p></Card>
            <Card className="p-4"><p className="text-sm font-extrabold text-ink2">🎯 Accuracy</p><p className="mt-1 font-display text-3xl font-bold">{accuracy === null ? "—" : `${accuracy}%`}</p></Card>
            <Card className="p-4"><p className="text-sm font-extrabold text-ink2">📅 Active days</p><p className="mt-1 font-display text-3xl font-bold">{report.activeDays}/{report.days.length || (range === "week" ? 7 : 30)}</p></Card>
          </div>

          <Card className="p-6">
            <h2 className="font-display text-xl font-bold">XP per day</h2>
            <div className="mt-4 h-56">
              {report.days.length === 0 ? (
                <p className="text-ink2">No activity in this range yet — finish a lesson and this chart wakes up.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={report.days} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--craie))" />
                    <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5)} tick={{ fontSize: 11 }} stroke="rgb(var(--ink2))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="rgb(var(--ink2))" allowDecimals={false} />
                    <Tooltip formatter={(v) => [`${v} XP`, "XP"]} labelFormatter={(d) => String(d)} />
                    <Bar dataKey="xp" fill="rgb(var(--bleu))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="p-6">
              <h2 className="font-display text-xl font-bold">Skills this {range}</h2>
              {report.skills.length === 0 ? (
                <p className="mt-3 text-ink2">Answer questions to build this view.</p>
              ) : (
                <div className="mt-4 flex flex-col gap-4">
                  {report.skills.map((s) => <SkillBar key={s.skill} skill={s.skill} pct={s.pct} n={s.n} />)}
                </div>
              )}
              {weakest && strongest && weakest.skill !== strongest.skill ? (
                <p className="mt-4 rounded-input bg-craie/40 p-3 text-sm">
                  💡 Strongest: <strong>{strongest.skill}</strong> ({strongest.pct}%). Focus area:{" "}
                  <strong>{weakest.skill}</strong> ({weakest.pct}%) — your daily plan already targets it.
                </p>
              ) : null}
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-bold">Weekly leaderboard</h2>
                {optedIn !== null ? (
                  <Button variant="soft" className="!h-9 !text-xs" onClick={toggleOptIn}>
                    {optedIn ? "Leave leaderboard" : "Join leaderboard"}
                  </Button>
                ) : null}
              </div>
              <p className="mt-1 font-mono text-xs text-ink2">Opt-in only. Your name appears once you join.</p>
              {leaders === null ? (
                <p className="mt-4 font-mono text-sm text-ink2">Loading…</p>
              ) : leaders.length === 0 ? (
                <p className="mt-4 text-ink2">Nobody has opted in yet — be the first.</p>
              ) : (
                <ol className="mt-4 flex flex-col gap-2">
                  {leaders.map((l, i) => (
                    <li key={`${l.name}${i}`} className="flex items-center gap-3 rounded-input border border-craie p-2.5">
                      <span className="w-6 text-center font-mono text-sm font-bold">{i + 1}</span>
                      <span aria-hidden="true">{l.avatar}</span>
                      <span className="flex-1 truncate text-sm font-extrabold">{l.name}</span>
                      <span className="font-mono text-sm">⚡ {l.xp}</span>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          </div>
        </>
      ) : (
        <p className="font-mono text-sm text-ink2">Loading…</p>
      )}
    </div>
  );
}
