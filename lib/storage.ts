"use client";

import type { ActivityLog, SessionSetup } from "@/lib/types";
import { defaultActivityCatalog, type ActivityCatalog } from "@/lib/activities";

const sessionKey = "factory-activity-session";
const sessionsKey = "factory-activity-sessions";
const legacyLogsKey = "factory-activity-logs";
const activitiesKey = "factory-activity-catalog";

function logsKey(sessionId: string) {
  return `factory-activity-logs:${sessionId}`;
}

export function loadSessions() {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(sessionsKey);
  const sessions = raw ? (JSON.parse(raw) as SessionSetup[]) : [];
  const legacyRaw = window.localStorage.getItem(sessionKey);
  if (!legacyRaw) return sessions;

  const legacySession = JSON.parse(legacyRaw) as SessionSetup;
  if (sessions.some((session) => session.sessionId === legacySession.sessionId)) return sessions;
  return [legacySession, ...sessions];
}

export function loadSession(sessionId: string) {
  if (typeof window === "undefined") return undefined;
  return loadSessions().find((session) => session.sessionId === sessionId);
}

export function saveSession(session: SessionSetup) {
  const sessions = loadSessions();
  const nextSessions = [session, ...sessions.filter((item) => item.sessionId !== session.sessionId)];
  window.localStorage.setItem(sessionsKey, JSON.stringify(nextSessions));
}

export function clearSession(sessionId: string) {
  const sessions = loadSessions().filter((session) => session.sessionId !== sessionId);
  window.localStorage.setItem(sessionsKey, JSON.stringify(sessions));
  const legacyRaw = window.localStorage.getItem(sessionKey);
  if (legacyRaw && (JSON.parse(legacyRaw) as SessionSetup).sessionId === sessionId) {
    window.localStorage.removeItem(sessionKey);
    window.localStorage.removeItem(legacyLogsKey);
  }
}

export function loadLogs(sessionId: string) {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(logsKey(sessionId));
  if (raw) return JSON.parse(raw) as ActivityLog[];

  const legacyRaw = window.localStorage.getItem(sessionKey);
  const legacySession = legacyRaw ? (JSON.parse(legacyRaw) as SessionSetup) : undefined;
  if (legacySession?.sessionId !== sessionId) return [];
  const legacyLogsRaw = window.localStorage.getItem(legacyLogsKey);
  return legacyLogsRaw ? (JSON.parse(legacyLogsRaw) as ActivityLog[]) : [];
}

export function saveLogs(logs: ActivityLog[], sessionId: string) {
  window.localStorage.setItem(logsKey(sessionId), JSON.stringify(logs));
}

export function clearLogs(sessionId: string) {
  window.localStorage.removeItem(logsKey(sessionId));
}

export function loadActivityCatalog() {
  if (typeof window === "undefined") return defaultActivityCatalog;
  const raw = window.localStorage.getItem(activitiesKey);
  if (!raw) return defaultActivityCatalog;

  try {
    return { ...defaultActivityCatalog, ...(JSON.parse(raw) as ActivityCatalog) };
  } catch {
    return defaultActivityCatalog;
  }
}

export function saveActivityCatalog(catalog: ActivityCatalog) {
  window.localStorage.setItem(activitiesKey, JSON.stringify(catalog));
}
