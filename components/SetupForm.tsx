"use client";

import { dateInputValue } from "@/lib/time";
import type { SessionSetup } from "@/lib/types";

type Props = {
  onStart: (session: SessionSetup) => void;
  onManageActivities: () => void;
  onOpenSession: (sessionId: string) => void;
  divisions: string[];
  sessions: SessionSetup[];
  initialSession?: SessionSetup;
};

export function SetupForm({ onStart, onManageActivities, onOpenSession, divisions, sessions, initialSession }: Props) {
  function handleSubmit(formData: FormData) {
    const division = String(formData.get("division") ?? "").trim();
    const operatorName = String(formData.get("operatorName") ?? "").trim();
    const machineNumber = String(formData.get("machineNumber") ?? "").trim();
    const shiftDate = String(formData.get("shiftDate") ?? dateInputValue());
    const shiftName = String(formData.get("shiftName") ?? "Day");

    if (!division || !operatorName || !machineNumber || !shiftDate) return;

    onStart({
      sessionId: initialSession?.sessionId ?? crypto.randomUUID(),
      division,
      operatorName,
      operators: [operatorName],
      machineNumber,
      shiftDate,
      shiftName,
      createdBy: operatorName
    });
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-6">
      <section className="rounded-lg border border-line bg-panel p-5 shadow-2xl">
        <div className="mb-6">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-info">Factory log</p>
          <h1 className="mt-2 text-3xl font-semibold text-ink">Machine Activity</h1>
          <p className="mt-2 text-sm text-muted">Set the operator context before logging timestamped machine and operator activity.</p>
        </div>

        <form action={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-muted">Division</span>
            <select
              name="division"
              required
              defaultValue={initialSession?.division ?? "Warping"}
              className="h-12 w-full rounded-md border border-line bg-panelSoft px-3 text-base text-ink outline-none focus:border-info"
            >
              {divisions.map((division) => (
                <option key={division}>{division}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-muted">Operator name</span>
            <input
              name="operatorName"
              required
              defaultValue={initialSession?.operatorName}
              placeholder="Operator"
              className="h-12 w-full rounded-md border border-line bg-panelSoft px-3 text-base text-ink outline-none placeholder:text-slate-600 focus:border-info"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-muted">Machine number</span>
            <input
              name="machineNumber"
              required
              defaultValue={initialSession?.machineNumber}
              placeholder="M-01"
              className="h-12 w-full rounded-md border border-line bg-panelSoft px-3 text-base text-ink outline-none placeholder:text-slate-600 focus:border-info"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-muted">Shift date</span>
              <input
                type="date"
                name="shiftDate"
                required
                defaultValue={initialSession?.shiftDate ?? dateInputValue()}
                className="h-12 w-full rounded-md border border-line bg-panelSoft px-3 text-base text-ink outline-none focus:border-info"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-muted">Shift</span>
              <select
                name="shiftName"
                defaultValue={initialSession?.shiftName ?? "Day"}
                className="h-12 w-full rounded-md border border-line bg-panelSoft px-3 text-base text-ink outline-none focus:border-info"
              >
                <option>Day</option>
                <option>Night</option>
                <option>A</option>
                <option>B</option>
                <option>C</option>
              </select>
            </label>
          </div>

          <button className="h-14 w-full rounded-md bg-action text-base font-bold text-slate-950 shadow-glow">
            Start logging
          </button>
          <button
            type="button"
            onClick={onManageActivities}
            className="h-12 w-full rounded-md border border-info/60 text-sm font-bold text-info"
          >
            Manage activity CRUD
          </button>
        </form>

        {sessions.length > 0 ? (
          <div className="mt-6 border-t border-line pt-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted">Open logging page</h2>
            <div className="mt-3 grid gap-2">
              {sessions.map((session) => (
                <button
                  key={session.sessionId}
                  type="button"
                  onClick={() => onOpenSession(session.sessionId)}
                  className="rounded-md border border-line bg-panelSoft px-3 py-3 text-left text-sm text-ink"
                >
                  <span className="block font-bold">
                    {session.division} | Machine {session.machineNumber}
                  </span>
                  <span className="mt-1 block text-xs text-muted">
                    {(session.operators?.length ? session.operators : [session.operatorName]).join(" + ")} | {session.shiftDate}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
