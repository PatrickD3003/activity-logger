import {
  deletePostgresLog,
  isPostgresConfigured,
  listPostgresLogs,
  listPostgresSessions,
  putPostgresSession,
  putPostgresLog,
  updatePostgresLog
} from "@/lib/postgres";
import {
  deleteLog as deleteDynamoLog,
  isDynamoConfigured,
  listLogs as listDynamoLogs,
  putLog as putDynamoLog,
  updateLog as updateDynamoLog
} from "@/lib/dynamodb";
import type { ActivityLog, LogInput, SessionSetup } from "@/lib/types";

export type LogPatch = Partial<Pick<ActivityLog, "note" | "operatorName" | "createdBy" | "updatedAt">> & {
  endTime?: string | null;
  durationSeconds?: number | null;
};

export type LogFilters = {
  sessionId?: string;
  division?: string;
  operatorName?: string;
  machineNumber?: string;
  date?: string;
};

export function getLogStorageName() {
  if (isPostgresConfigured()) return "postgres";
  if (isDynamoConfigured()) return "dynamodb";
  return "local";
}

export function isServerLogStorageConfigured() {
  return getLogStorageName() !== "local";
}

export async function putLog(input: LogInput) {
  if (isPostgresConfigured()) return putPostgresLog(input);
  if (isDynamoConfigured()) return putDynamoLog(input);
  return input;
}

export async function updateLog(logId: string, patch: LogPatch) {
  if (isPostgresConfigured()) return updatePostgresLog(logId, patch);
  if (isDynamoConfigured()) return updateDynamoLog(logId, patch);
  return undefined;
}

export async function deleteLog(logId: string) {
  if (isPostgresConfigured()) return deletePostgresLog(logId);
  if (isDynamoConfigured()) return deleteDynamoLog(logId);
}

export async function listLogs(filters: LogFilters) {
  if (isPostgresConfigured()) return listPostgresLogs(filters);
  if (isDynamoConfigured()) return listDynamoLogs(filters);
  return [];
}

export async function putSession(session: SessionSetup) {
  if (isPostgresConfigured()) return putPostgresSession(session);
  return session;
}

export async function listSessions() {
  if (isPostgresConfigured()) return listPostgresSessions();
  return [];
}
