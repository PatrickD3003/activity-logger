import {
  deletePostgresLog,
  isPostgresConfigured,
  listPostgresLogs,
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
import type { ActivityLog, LogInput } from "@/lib/types";

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
