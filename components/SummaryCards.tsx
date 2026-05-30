"use client";

import type { ActivityLog } from "@/lib/types";
import { formatDuration, secondsBetween } from "@/lib/time";

type Props = {
  logs: ActivityLog[];
  nowIso?: string;
};

export function SummaryCards({ logs, nowIso }: Props) {
  const totals = logs.reduce(
    (acc, log) => {
      const seconds = log.durationSeconds ?? secondsBetween(log.startTime, nowIso);
      if (log.activityCode === "RUN") acc.running += seconds;
      if (["ID", "MT", "PW", "BK"].includes(log.activityCode)) acc.stoppage += seconds;
      return acc;
    },
    { running: 0, stoppage: 0 }
  );
  const totalTracked = totals.running + totals.stoppage;
  const efficiency = totalTracked > 0 ? Math.round((totals.running / totalTracked) * 100) : 0;

  const cards = [
    { label: "Entries", value: logs.length.toString() },
    { label: "Running", value: formatDuration(totals.running) },
    { label: "Stoppage", value: formatDuration(totals.stoppage) },
    { label: "Efficiency", value: `${efficiency}%` }
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-lg border border-line bg-panel p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{card.label}</p>
          <p className="mt-2 text-xl font-bold text-ink">{card.value}</p>
        </div>
      ))}
    </div>
  );
}
