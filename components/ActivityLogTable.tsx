"use client";

import type { ActivityLog } from "@/lib/types";
import { formatClock, formatDuration } from "@/lib/time";

type Props = {
  logs: ActivityLog[];
  onNoteChange: (logId: string, note: string) => void;
  onDeleteLog: (logId: string) => void;
};

export function ActivityLogTable({ logs, onNoteChange, onDeleteLog }: Props) {
  return (
    <section className="rounded-lg border border-line bg-panel">
      <div className="border-b border-line px-4 py-3">
        <h2 className="text-base font-semibold text-ink">Activity Log</h2>
      </div>
      <div className="divide-y divide-line">
        {logs.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted">No entries yet.</p>
        ) : (
          logs
            .slice()
            .reverse()
            .map((log) => (
              <article key={log.logId} className="grid gap-3 px-4 py-4">
                <div className="grid grid-cols-[4rem_1fr_auto] items-center gap-3">
                  <span className="rounded-md bg-panelSoft px-2 py-2 text-center text-lg font-black text-ink">{log.activityCode}</span>
                  <div>
                    <p className="font-semibold text-ink">{log.activityName}</p>
                    <p className="text-xs text-muted">
                      {log.operatorName} | {formatClock(log.startTime)} - {log.endTime ? formatClock(log.endTime) : "Active"}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-info">{formatDuration(log.durationSeconds)}</span>
                </div>
                <label className="block">
                  <span className="sr-only">Note for {log.activityCode}</span>
                  <textarea
                    value={log.note}
                    onChange={(event) => onNoteChange(log.logId, event.target.value)}
                    rows={2}
                    placeholder="Tap to add note"
                    className="w-full resize-none rounded-md border border-line bg-panelSoft px-3 py-2 text-sm text-ink outline-none placeholder:text-slate-600 focus:border-info"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => onDeleteLog(log.logId)}
                  className="h-10 rounded-md border border-danger/60 text-sm font-bold text-red-300"
                >
                  Delete entry
                </button>
              </article>
            ))
        )}
      </div>
    </section>
  );
}
