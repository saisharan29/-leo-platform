import { Card } from "@/components/ui/card";

export function StatTile({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: string;
}) {
  return (
    <Card className="p-4">
      <p className="text-sm font-extrabold text-ink2">
        {icon ? (
          <span aria-hidden="true" className="mr-1">
            {icon}
          </span>
        ) : null}
        {label}
      </p>
      <p className="mt-1 font-display text-3xl font-bold">{value}</p>
      {hint ? <p className="mt-1 font-mono text-xs text-ink2">{hint}</p> : null}
    </Card>
  );
}

const SKILL_LABEL: Record<string, string> = {
  vocab: "Vocabulary",
  grammar: "Grammar",
  listening: "Listening",
  reading: "Reading",
  writing: "Writing",
  speaking: "Speaking",
};

export function SkillBar({ skill, pct, n }: { skill: string; pct: number; n: number }) {
  const clamped = Math.max(0, Math.min(100, Math.round(pct)));
  const hasData = n > 0;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-sm font-extrabold">{SKILL_LABEL[skill] ?? skill}</span>
        <span className="font-mono text-xs text-ink2">
          {hasData ? `${clamped}% · ${n} answered` : "no data yet"}
        </span>
      </div>
      <div
        className="h-2.5 overflow-hidden rounded-full bg-craie"
        role="progressbar"
        aria-valuenow={hasData ? clamped : 0}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${SKILL_LABEL[skill] ?? skill} accuracy`}
      >
        <div
          className={`h-full rounded-full ${hasData ? "bg-bleu" : "bg-transparent"}`}
          style={{ width: `${hasData ? clamped : 0}%` }}
        />
      </div>
    </div>
  );
}

export type NodeState = "locked" | "current" | "done";

/** Big circular path node, Duolingo-style. */
export function LessonNode({
  number,
  title,
  state,
  stars,
}: {
  number: number;
  title: string;
  state: NodeState;
  stars: number;
}) {
  const disc =
    state === "done"
      ? "chunky chunky-menthe bg-menthe text-white"
      : state === "current"
        ? "chunky chunky-bleu pulse-ring bg-bleu text-white"
        : "border-2 border-craie bg-craie/60 text-ink2";
  return (
    <span className="relative flex flex-col items-center gap-1.5 text-center">
      {state === "current" ? (
        <span
          aria-hidden="true"
          className="bounce-soft absolute -top-9 rounded-full border-2 border-bleu bg-card px-3 py-0.5 font-display text-xs font-bold uppercase tracking-wide text-bleu shadow-card"
        >
          Start
        </span>
      ) : null}
      <span
        aria-hidden="true"
        className={`node-lg flex items-center justify-center rounded-full font-display text-2xl font-bold ${disc}`}
      >
        {state === "done" ? "✓" : state === "locked" ? "🔒" : number}
      </span>
      {state === "done" ? (
        <span aria-hidden="true" className="-mt-2 text-sm tracking-tighter text-brioche drop-shadow-sm">
          {"★".repeat(stars)}
          <span className="text-craie">{"★".repeat(Math.max(0, 3 - stars))}</span>
        </span>
      ) : null}
      <span className={`block w-28 truncate text-xs font-extrabold ${state === "locked" ? "text-ink2/70" : ""}`}>
        {title}
      </span>
      <span className="sr-only">
        Lesson {number}: {state === "locked" ? "locked" : state === "current" ? "up next" : `done, ${stars} of 3 stars`}
      </span>
    </span>
  );
}
