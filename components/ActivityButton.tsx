"use client";

import type { ActivityDefinition } from "@/lib/activities";

type Props = {
  activity: ActivityDefinition;
  active: boolean;
  onTap: () => void;
};

const toneClass = {
  run: "border-emerald-500/40 bg-emerald-500/12",
  idle: "border-sky-500/40 bg-sky-500/12",
  stop: "border-red-500/40 bg-red-500/12",
  work: "border-amber-500/40 bg-amber-500/12",
  break: "border-violet-500/40 bg-violet-500/12"
};

export function ActivityButton({ activity, active, onTap }: Props) {
  return (
    <button
      type="button"
      onClick={onTap}
      className={`grid min-h-20 w-full grid-cols-[4.5rem_1fr] items-center rounded-lg border px-3 text-left transition active:scale-[0.98] ${
        active ? "border-action bg-action text-slate-950 shadow-glow" : `${toneClass[activity.tone]} text-ink`
      }`}
    >
      <span className={`text-2xl font-black ${active ? "text-slate-950" : "text-ink"}`}>{activity.code}</span>
      <span className="text-base font-semibold leading-tight">{activity.name}</span>
    </button>
  );
}
