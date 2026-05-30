"use client";

import { useEffect, useMemo, useState } from "react";
import { ActivityManager } from "@/components/ActivityManager";
import { ActivityButton } from "@/components/ActivityButton";
import { ActivityLogTable } from "@/components/ActivityLogTable";
import { SetupForm } from "@/components/SetupForm";
import { SummaryCards } from "@/components/SummaryCards";
import { defaultActivityCatalog, getActivitiesForDivision, getDivisions, splitActivitiesByKind, type ActivityCatalog } from "@/lib/activities";
import { downloadCsv, logsToCsv } from "@/lib/csv";
import {
  clearLogs,
  clearSession,
  loadActivityCatalog,
  loadLogs,
  loadSession,
  loadSessions,
  saveActivityCatalog,
  saveLogs,
  saveSession
} from "@/lib/storage";
import { formatClock, formatDate, formatDuration, secondsBetween } from "@/lib/time";
import type { ActivityLog, SessionSetup } from "@/lib/types";

type LogPatch = Omit<Partial<ActivityLog>, "endTime" | "durationSeconds"> & {
  endTime?: string | null;
  durationSeconds?: number | null;
};

export default function Home() {
  const [currentSessionId, setCurrentSessionId] = useState("");
  const [session, setSession] = useState<SessionSetup>();
  const [savedSessions, setSavedSessions] = useState<SessionSetup[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [activityCatalog, setActivityCatalog] = useState<ActivityCatalog>(defaultActivityCatalog);
  const [showActivityManager, setShowActivityManager] = useState(false);
  const [selectedOperator, setSelectedOperator] = useState("");
  const [renameOperatorMode, setRenameOperatorMode] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [nowIso, setNowIso] = useState(() => new Date().toISOString());

  useEffect(() => {
    function hydrateFromUrl() {
      const sessionId = new URLSearchParams(window.location.search).get("session") ?? "";
      const storedSession = sessionId ? loadSession(sessionId) : undefined;
      setCurrentSessionId(sessionId);
      setSession(storedSession);
      setSavedSessions(loadSessions());
      setSelectedOperator(storedSession?.operators?.[0] ?? storedSession?.operatorName ?? "");
      setLogs(storedSession ? loadLogs(storedSession.sessionId) : []);
      setShowActivityManager(false);
      setRenameOperatorMode(false);
    }

    setActivityCatalog(loadActivityCatalog());
    hydrateFromUrl();
    setMounted(true);
    window.addEventListener("popstate", hydrateFromUrl);
    return () => window.removeEventListener("popstate", hydrateFromUrl);
  }, []);

  useEffect(() => {
    if (!mounted || !currentSessionId) return;
    saveLogs(logs, currentSessionId);
  }, [currentSessionId, logs, mounted]);

  const divisions = useMemo(() => getDivisions(activityCatalog), [activityCatalog]);
  const sessionActivities = useMemo(
    () => (session ? getActivitiesForDivision(activityCatalog, session.division) : []),
    [activityCatalog, session]
  );
  const groupedActivities = useMemo(() => splitActivitiesByKind(sessionActivities), [sessionActivities]);
  const operatorNames = useMemo(() => {
    if (!session) return [];
    return session.operators?.length ? session.operators : [session.operatorName];
  }, [session]);
  const activeMachineLog = useMemo(
    () =>
      logs.find((log) => {
        if (log.endTime) return false;
        const activity = sessionActivities.find((item) => item.code === log.activityCode);
        return activity?.kind === "machine";
      }),
    [logs, sessionActivities]
  );
  const activeOperatorLog = useMemo(
    () =>
      logs.find((log) => {
        if (log.endTime || log.operatorName !== selectedOperator) return false;
        const activity = sessionActivities.find((item) => item.code === log.activityCode);
        return activity?.kind === "operator";
      }),
    [logs, selectedOperator, sessionActivities]
  );
  const activeLogIds = useMemo(() => logs.filter((log) => !log.endTime).map((log) => log.logId).join(","), [logs]);

  useEffect(() => {
    if (!activeLogIds) return;
    const timer = window.setInterval(() => setNowIso(new Date().toISOString()), 1000);
    return () => window.clearInterval(timer);
  }, [activeLogIds]);

  function startSession(nextSession: SessionSetup) {
    const normalizedSession = {
      ...nextSession,
      operators: nextSession.operators?.length ? nextSession.operators : [nextSession.operatorName]
    };
    setSelectedOperator(normalizedSession.operators[0]);
    setSession(normalizedSession);
    setCurrentSessionId(normalizedSession.sessionId);
    setLogs([]);
    saveSession(normalizedSession);
    saveLogs([], normalizedSession.sessionId);
    setSavedSessions(loadSessions());
    window.history.pushState({}, "", `/?session=${encodeURIComponent(normalizedSession.sessionId)}`);
  }

  function openSession(sessionId: string) {
    const nextSession = loadSession(sessionId);
    if (!nextSession) return;
    setCurrentSessionId(sessionId);
    setSession(nextSession);
    setSelectedOperator(nextSession.operators?.[0] ?? nextSession.operatorName);
    setLogs(loadLogs(sessionId));
    setShowActivityManager(false);
    window.history.pushState({}, "", `/?session=${encodeURIComponent(sessionId)}`);
  }

  function openNewSessionSetup() {
    setCurrentSessionId("");
    setSession(undefined);
    setLogs([]);
    setSelectedOperator("");
    setShowActivityManager(false);
    setRenameOperatorMode(false);
    window.history.pushState({}, "", "/");
  }

  function updateActivityCatalog(nextCatalog: ActivityCatalog) {
    setActivityCatalog(nextCatalog);
    saveActivityCatalog(nextCatalog);
  }

  function addOperator() {
    if (!session) return;
    const operatorName = window.prompt("Operator name");
    const cleanedName = operatorName?.trim();
    if (!cleanedName) return;
    if (operatorNames.some((name) => name.toLowerCase() === cleanedName.toLowerCase())) {
      window.alert(`${cleanedName} is already assigned to this machine.`);
      return;
    }

    const nextSession = {
      ...session,
      operators: [...operatorNames, cleanedName]
    };
    setSession(nextSession);
    setSelectedOperator(cleanedName);
    saveSession(nextSession);
    setSavedSessions(loadSessions());
  }

  function renameOperator(operatorName: string) {
    if (!session) return;
    const nextName = window.prompt(`Rename ${operatorName} to`, operatorName);
    const cleanedName = nextName?.trim();
    setRenameOperatorMode(false);
    if (!cleanedName || cleanedName === operatorName) return;

    if (operatorNames.some((name) => name.toLowerCase() === cleanedName.toLowerCase() && name !== operatorName)) {
      window.alert(`${cleanedName} is already assigned to this machine.`);
      return;
    }

    const nextOperators = operatorNames.map((name) => (name === operatorName ? cleanedName : name));
    const nextSession = {
      ...session,
      operatorName: session.operatorName === operatorName ? cleanedName : session.operatorName,
      operators: nextOperators,
      createdBy: session.createdBy === operatorName ? cleanedName : session.createdBy
    };
    const now = new Date().toISOString();
    const nextLogs = logs.map((log) =>
      log.operatorName === operatorName
        ? {
            ...log,
            operatorName: cleanedName,
            createdBy: log.createdBy === operatorName ? cleanedName : log.createdBy,
            updatedAt: now
          }
        : log
    );

    setSession(nextSession);
    setLogs(nextLogs);
    setSelectedOperator(selectedOperator === operatorName ? cleanedName : selectedOperator);
    saveSession(nextSession);
    if (currentSessionId) saveLogs(nextLogs, currentSessionId);
    setSavedSessions(loadSessions());
    nextLogs
      .filter((log) => log.operatorName === cleanedName)
      .forEach((log) =>
        updateRemoteLog(log.logId, {
          operatorName: cleanedName,
          createdBy: log.createdBy,
          updatedAt: log.updatedAt
        })
      );
  }

  function handleOperatorButton(operatorName: string) {
    if (renameOperatorMode) {
      renameOperator(operatorName);
      return;
    }
    setSelectedOperator(operatorName);
  }

  function closeMatchingActiveLogs(activityKind: "machine" | "operator", now: string) {
    const closedLogs: ActivityLog[] = [];
    const nextLogs = logs.map((log) => {
      if (log.endTime) return log;
      const logActivity = sessionActivities.find((item) => item.code === log.activityCode);
      const isSameTrack =
        activityKind === "machine"
          ? logActivity?.kind === "machine"
          : logActivity?.kind === "operator" && log.operatorName === selectedOperator;

      if (!isSameTrack) return log;

      const closedLog = {
        ...log,
        endTime: now,
        durationSeconds: secondsBetween(log.startTime, now),
        updatedAt: now
      };
      closedLogs.push(closedLog);
      return closedLog;
    });

    return { nextLogs, closedLogs };
  }

  async function syncLog(log: ActivityLog) {
    try {
      await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(log)
      });
    } catch {
      // Local logging remains the source of truth when offline or AWS is not configured.
    }
  }

  async function updateRemoteLog(logId: string, patch: LogPatch) {
    try {
      await fetch(`/api/logs/${logId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch)
      });
    } catch {
      // Edits are retained locally and can be exported even if sync is unavailable.
    }
  }

  async function deleteRemoteLog(logId: string) {
    try {
      await fetch(`/api/logs/${logId}`, {
        method: "DELETE"
      });
    } catch {
      // Local deletion remains available when offline or AWS is not configured.
    }
  }

  function tapActivity(code: string) {
    if (!session || !selectedOperator) return;
    const activity = sessionActivities.find((item) => item.code === code);
    if (!activity) return;

    const now = new Date().toISOString();
    const { nextLogs, closedLogs } = closeMatchingActiveLogs(activity.kind, now);

    const newLog: ActivityLog = {
      logId: crypto.randomUUID(),
      sessionId: session.sessionId,
      division: session.division,
      operatorName: selectedOperator,
      machineNumber: session.machineNumber,
      activityCode: activity.code,
      activityName: activity.name,
      startTime: now,
      note: "",
      createdAt: now,
      updatedAt: now,
      createdBy: selectedOperator
    };

    setLogs([...nextLogs, newLog]);
    closedLogs.forEach((closedLog) => updateRemoteLog(closedLog.logId, closedLog));
    syncLog(newLog);
  }

  function handleNoteChange(logId: string, note: string) {
    const now = new Date().toISOString();
    setLogs((current) =>
      current.map((log) => (log.logId === logId ? { ...log, note, updatedAt: now } : log))
    );
    updateRemoteLog(logId, { note, updatedAt: now });
  }

  function getLogActivityKind(log: ActivityLog) {
    const activity = sessionActivities.find((item) => item.code === log.activityCode);
    if (activity?.kind) return activity.kind;
    return ["RUN", "ID", "MT", "PW"].includes(log.activityCode) ? "machine" : "operator";
  }

  function isSameLogTrack(first: ActivityLog, second: ActivityLog) {
    const firstKind = getLogActivityKind(first);
    const secondKind = getLogActivityKind(second);
    if (firstKind !== secondKind) return false;
    return firstKind === "machine" || first.operatorName === second.operatorName;
  }

  function reopenLog(log: ActivityLog) {
    const { endTime: _endTime, durationSeconds: _durationSeconds, ...openLog } = log;
    return {
      ...openLog,
      updatedAt: new Date().toISOString()
    };
  }

  function handleDeleteLog(logId: string) {
    const deletedLog = logs.find((log) => log.logId === logId);
    if (!deletedLog) return;
    const confirmed = window.confirm(
      deletedLog.endTime
        ? `Delete ${deletedLog.activityCode} for ${deletedLog.operatorName}?`
        : `Delete active ${deletedLog.activityCode} for ${deletedLog.operatorName} and reopen the previous activity on this track?`
    );
    if (!confirmed) return;

    let reopenedLog: ActivityLog | undefined;
    const remainingLogs = logs.filter((log) => log.logId !== logId);

    if (!deletedLog.endTime) {
      const previousLog = remainingLogs
        .filter((log) => isSameLogTrack(log, deletedLog) && log.startTime < deletedLog.startTime)
        .sort((first, second) => new Date(second.startTime).getTime() - new Date(first.startTime).getTime())[0];

      if (previousLog) reopenedLog = reopenLog(previousLog);
    }

    const nextLogs = reopenedLog
      ? remainingLogs.map((log) => (log.logId === reopenedLog?.logId ? reopenedLog : log))
      : remainingLogs;

    setLogs(nextLogs);
    deleteRemoteLog(logId);
    if (reopenedLog) {
      updateRemoteLog(reopenedLog.logId, { endTime: null, durationSeconds: null, updatedAt: reopenedLog.updatedAt });
    }
  }

  function resetAll() {
    const confirmed = window.confirm("Clear the current session and all local activity logs?");
    if (!confirmed) return;
    if (currentSessionId) {
      clearLogs(currentSessionId);
      clearSession(currentSessionId);
    }
    setCurrentSessionId("");
    setSavedSessions(loadSessions());
    setLogs([]);
    setSession(undefined);
    window.history.pushState({}, "", "/");
  }

  function exportCurrentSession() {
    const csv = logsToCsv(logs, session);
    const filename = `activity-${session?.division ?? "session"}-${session?.machineNumber ?? "machine"}-${Date.now()}.csv`;
    downloadCsv(csv, filename.replaceAll(" ", "-").toLowerCase());
  }

  if (!mounted) return null;
  if (!session && showActivityManager) {
    return (
      <main className="min-h-dvh bg-[#0b0f16] px-3 py-4">
        <div className="mx-auto grid w-full max-w-3xl gap-4">
          <ActivityManager
            catalog={activityCatalog}
            currentDivision={divisions[0] ?? "Warping"}
            onChange={updateActivityCatalog}
            onClose={() => setShowActivityManager(false)}
          />
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <SetupForm
        onStart={startSession}
        onManageActivities={() => setShowActivityManager(true)}
        onOpenSession={openSession}
        divisions={divisions}
        sessions={savedSessions}
      />
    );
  }

  return (
    <main className="min-h-dvh bg-[#0b0f16] px-3 py-4">
      <div className="mx-auto grid w-full max-w-3xl gap-4">
        <header className="rounded-lg border border-line bg-panel p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-info">{session.division}</p>
              <h1 className="mt-1 text-2xl font-bold text-ink">Machine {session.machineNumber}</h1>
              <p className="mt-1 text-sm text-muted">
                {operatorNames.join(" + ")} | {session.shiftName} | {formatDate(session.shiftDate)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowActivityManager((current) => !current)}
              className="h-10 rounded-md border border-line px-3 text-sm font-semibold text-muted"
            >
              Activities
            </button>
          </div>
        </header>

        {showActivityManager ? (
          <ActivityManager
            catalog={activityCatalog}
            currentDivision={session.division}
            onChange={updateActivityCatalog}
            onClose={() => setShowActivityManager(false)}
          />
        ) : null}

        <section className="grid gap-3 sm:grid-cols-2">
          <ActiveStatusCard title="Machine status" log={activeMachineLog} nowIso={nowIso} />
          <ActiveStatusCard title={`${selectedOperator || "Operator"} activity`} log={activeOperatorLog} nowIso={nowIso} />
        </section>

        <SummaryCards logs={logs} nowIso={nowIso} />

        <section className="grid gap-3 rounded-lg border border-line bg-panel p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted">Select operator</h2>
              <p className="mt-1 text-sm text-muted">
                {renameOperatorMode ? "Tap an operator name to rename it." : "Operator activity buttons log for the selected person."}
              </p>
            </div>
            <div className="grid gap-2">
              <button type="button" onClick={addOperator} className="h-10 rounded-md border border-info/60 px-3 text-sm font-bold text-info">
                Add operator
              </button>
              <button
                type="button"
                onClick={() => setRenameOperatorMode((current) => !current)}
                className={`h-10 rounded-md border px-3 text-sm font-bold ${
                  renameOperatorMode ? "border-action bg-action text-slate-950" : "border-line text-muted"
                }`}
              >
                Rename operator
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {operatorNames.map((operatorName) => (
              <button
                key={operatorName}
                type="button"
                onClick={() => handleOperatorButton(operatorName)}
                className={`h-12 rounded-md border px-3 text-sm font-bold ${
                  renameOperatorMode
                    ? "border-info bg-sky-500/10 text-info"
                    : selectedOperator === operatorName
                    ? "border-action bg-action text-slate-950 shadow-glow"
                    : "border-line bg-panelSoft text-ink"
                }`}
              >
                {operatorName}
              </button>
            ))}
          </div>
        </section>

        <section className="grid gap-3">
          <h2 className="px-1 text-sm font-semibold uppercase tracking-[0.16em] text-muted">Machine status</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {groupedActivities.machine.map((activity) => (
              <ActivityButton
                key={activity.id}
                activity={activity}
                active={activeMachineLog?.activityCode === activity.code}
                onTap={() => tapActivity(activity.code)}
              />
            ))}
            {groupedActivities.machine.length === 0 ? (
              <p className="rounded-lg border border-line bg-panel p-4 text-sm text-muted">No machine status activities configured for {session.division}.</p>
            ) : null}
          </div>
        </section>

        <section className="grid gap-3">
          <h2 className="px-1 text-sm font-semibold uppercase tracking-[0.16em] text-muted">Operator activity</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {groupedActivities.operator.map((activity) => (
              <ActivityButton
                key={activity.id}
                activity={activity}
                active={activeOperatorLog?.activityCode === activity.code}
                onTap={() => tapActivity(activity.code)}
              />
            ))}
            {groupedActivities.operator.length === 0 ? (
              <p className="rounded-lg border border-line bg-panel p-4 text-sm text-muted">No operator activities configured for {session.division}.</p>
            ) : null}
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={exportCurrentSession}
            className="h-12 rounded-md bg-info text-sm font-bold text-slate-950"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={openNewSessionSetup}
            className="h-12 rounded-md border border-line text-sm font-bold text-muted"
          >
            New page
          </button>
          <button
            type="button"
            onClick={resetAll}
            className="h-12 rounded-md border border-danger/60 text-sm font-bold text-red-300"
          >
            Clear / reset
          </button>
        </div>

        <ActivityLogTable logs={logs} onNoteChange={handleNoteChange} onDeleteLog={handleDeleteLog} />
      </div>
    </main>
  );
}

function ActiveStatusCard({ title, log, nowIso }: { title: string; log?: ActivityLog; nowIso: string }) {
  return (
    <section className={`rounded-lg border p-4 ${log ? "border-action bg-emerald-500/10" : "border-line bg-panel"}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{title}</p>
      {log ? (
        <div className="mt-2 flex items-end justify-between gap-3">
          <div>
            <p className="text-3xl font-black text-ink">{log.activityCode}</p>
            <p className="text-sm font-semibold text-ink">{log.activityName}</p>
            <p className="mt-1 text-sm text-muted">Started {formatClock(log.startTime)}</p>
          </div>
          <p className="text-xl font-bold text-action">{formatDuration(secondsBetween(log.startTime, nowIso))}</p>
        </div>
      ) : (
        <p className="mt-2 text-lg font-semibold text-muted">No active log.</p>
      )}
    </section>
  );
}
