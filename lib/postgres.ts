import { Pool } from "pg";
import type { ActivityLog, LogInput, SessionSetup } from "@/lib/types";

const databaseUrl = process.env.DATABASE_URL;

const pool = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined
    })
  : undefined;

type LogPatch = Partial<Pick<ActivityLog, "note" | "operatorName" | "createdBy" | "updatedAt">> & {
  endTime?: string | null;
  durationSeconds?: number | null;
};

type LogFilters = {
  sessionId?: string;
  division?: string;
  operatorName?: string;
  machineNumber?: string;
  date?: string;
};

type SessionRow = {
  session_id: string;
  division: string;
  operator_name: string;
  operators: string[] | null;
  machine_number: string;
  shift_date: string | Date;
  shift_name: string;
  created_by: string;
  created_at: string | Date;
  updated_at: string | Date;
};

type LogRow = {
  log_id: string;
  session_id: string;
  division: string;
  operator_name: string;
  machine_number: string;
  activity_code: string;
  activity_name: string;
  start_time: string | Date;
  end_time: string | Date | null;
  duration_seconds: number | null;
  note: string | null;
  created_at: string | Date;
  updated_at: string | Date;
  created_by: string;
};

export function isPostgresConfigured() {
  return Boolean(pool);
}

function requirePool() {
  if (!pool) throw new Error("DATABASE_URL is not configured");
  return pool;
}

let sessionsTableReady: Promise<void> | undefined;

async function ensureSessionsTable() {
  const db = requirePool();
  sessionsTableReady ??= db.query(
    `CREATE TABLE IF NOT EXISTS activity_sessions (
      session_id TEXT PRIMARY KEY,
      division TEXT NOT NULL,
      operator_name TEXT NOT NULL,
      operators JSONB NOT NULL DEFAULT '[]'::jsonb,
      machine_number TEXT NOT NULL,
      shift_date DATE NOT NULL,
      shift_name TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    );

    CREATE INDEX IF NOT EXISTS activity_sessions_filters_idx
      ON activity_sessions (shift_date, division, machine_number);`
  ).then(() => undefined);

  return sessionsTableReady;
}

function toIso(value: string | Date | null) {
  if (!value) return undefined;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function rowToSession(row: SessionRow): SessionSetup {
  const operators = Array.isArray(row.operators) ? row.operators : [];

  return {
    sessionId: row.session_id,
    division: row.division,
    operatorName: row.operator_name,
    operators: operators.length ? operators : [row.operator_name],
    machineNumber: row.machine_number,
    shiftDate: toIso(row.shift_date)?.slice(0, 10) ?? String(row.shift_date),
    shiftName: row.shift_name,
    createdBy: row.created_by
  };
}

export async function putPostgresSession(session: SessionSetup) {
  const db = requirePool();
  await ensureSessionsTable();
  const now = new Date().toISOString();
  const operators = session.operators?.length ? session.operators : [session.operatorName];

  await db.query(
    `INSERT INTO activity_sessions (
      session_id, division, operator_name, operators, machine_number,
      shift_date, shift_name, created_by, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    ON CONFLICT (session_id) DO UPDATE SET
      division = EXCLUDED.division,
      operator_name = EXCLUDED.operator_name,
      operators = EXCLUDED.operators,
      machine_number = EXCLUDED.machine_number,
      shift_date = EXCLUDED.shift_date,
      shift_name = EXCLUDED.shift_name,
      created_by = EXCLUDED.created_by,
      updated_at = EXCLUDED.updated_at`,
    [
      session.sessionId,
      session.division,
      session.operatorName,
      JSON.stringify(operators),
      session.machineNumber,
      session.shiftDate,
      session.shiftName,
      session.createdBy,
      now,
      now
    ]
  );

  return session;
}

export async function listPostgresSessions() {
  const db = requirePool();
  await ensureSessionsTable();
  const result = await db.query<SessionRow>(
    "SELECT * FROM activity_sessions ORDER BY shift_date DESC, created_at DESC"
  );

  return result.rows.map(rowToSession);
}

export async function deletePostgresSession(sessionId: string) {
  const db = requirePool();
  await ensureSessionsTable();
  await db.query("DELETE FROM activity_sessions WHERE session_id = $1", [sessionId]);
}

function rowToLog(row: LogRow): ActivityLog {
  return {
    logId: row.log_id,
    sessionId: row.session_id,
    division: row.division,
    operatorName: row.operator_name,
    machineNumber: row.machine_number,
    activityCode: row.activity_code,
    activityName: row.activity_name,
    startTime: toIso(row.start_time) ?? "",
    endTime: toIso(row.end_time),
    durationSeconds: row.duration_seconds ?? undefined,
    note: row.note ?? "",
    createdAt: toIso(row.created_at) ?? "",
    updatedAt: toIso(row.updated_at) ?? "",
    createdBy: row.created_by
  };
}

export async function putPostgresLog(input: LogInput) {
  const db = requirePool();
  const now = new Date().toISOString();
  const log: ActivityLog = {
    ...input,
    logId: input.logId ?? crypto.randomUUID(),
    createdAt: now,
    updatedAt: now
  };

  await db.query(
    `INSERT INTO activity_logs (
      log_id, session_id, division, operator_name, machine_number,
      activity_code, activity_name, start_time, end_time, duration_seconds,
      note, created_at, updated_at, created_by
    ) VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9, $10,
      $11, $12, $13, $14
    )
    ON CONFLICT (log_id) DO UPDATE SET
      session_id = EXCLUDED.session_id,
      division = EXCLUDED.division,
      operator_name = EXCLUDED.operator_name,
      machine_number = EXCLUDED.machine_number,
      activity_code = EXCLUDED.activity_code,
      activity_name = EXCLUDED.activity_name,
      start_time = EXCLUDED.start_time,
      end_time = EXCLUDED.end_time,
      duration_seconds = EXCLUDED.duration_seconds,
      note = EXCLUDED.note,
      updated_at = EXCLUDED.updated_at,
      created_by = EXCLUDED.created_by`,
    [
      log.logId,
      log.sessionId,
      log.division,
      log.operatorName,
      log.machineNumber,
      log.activityCode,
      log.activityName,
      log.startTime,
      log.endTime ?? null,
      log.durationSeconds ?? null,
      log.note,
      log.createdAt,
      log.updatedAt,
      log.createdBy
    ]
  );

  return log;
}

export async function updatePostgresLog(logId: string, patch: LogPatch) {
  const db = requirePool();
  const values: unknown[] = [logId];
  const sets: string[] = ["updated_at = $2"];
  values.push(patch.updatedAt ?? new Date().toISOString());

  const fieldMap = {
    note: "note",
    operatorName: "operator_name",
    createdBy: "created_by",
    endTime: "end_time",
    durationSeconds: "duration_seconds"
  } as const;

  Object.entries(fieldMap).forEach(([field, column]) => {
    const value = patch[field as keyof typeof fieldMap];
    if (value === undefined) return;
    values.push(value);
    sets.push(`${column} = $${values.length}`);
  });

  const result = await db.query<LogRow>(
    `UPDATE activity_logs SET ${sets.join(", ")} WHERE log_id = $1 RETURNING *`,
    values
  );

  return result.rows[0] ? rowToLog(result.rows[0]) : undefined;
}

export async function deletePostgresLog(logId: string) {
  const db = requirePool();
  await db.query("DELETE FROM activity_logs WHERE log_id = $1", [logId]);
}

export async function listPostgresLogs(filters: LogFilters) {
  const db = requirePool();
  const values: string[] = [];
  const clauses: string[] = [];

  if (filters.sessionId) {
    values.push(filters.sessionId);
    clauses.push(`session_id = $${values.length}`);
  }
  if (filters.division) {
    values.push(filters.division);
    clauses.push(`division = $${values.length}`);
  }
  if (filters.operatorName) {
    values.push(filters.operatorName);
    clauses.push(`operator_name = $${values.length}`);
  }
  if (filters.machineNumber) {
    values.push(filters.machineNumber);
    clauses.push(`machine_number = $${values.length}`);
  }
  if (filters.date) {
    values.push(`${filters.date}%`);
    clauses.push(`start_time::text LIKE $${values.length}`);
  }

  const result = await db.query<LogRow>(
    `SELECT * FROM activity_logs ${clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""} ORDER BY start_time ASC`,
    values
  );

  return result.rows.map(rowToLog);
}
