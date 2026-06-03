CREATE TABLE IF NOT EXISTS activity_sessions (
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
  ON activity_sessions (shift_date, division, machine_number);

CREATE TABLE IF NOT EXISTS activity_logs (
  log_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  division TEXT NOT NULL,
  operator_name TEXT NOT NULL,
  machine_number TEXT NOT NULL,
  activity_code TEXT NOT NULL,
  activity_name TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_seconds INTEGER,
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  created_by TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS activity_logs_session_start_idx
  ON activity_logs (session_id, start_time);

CREATE INDEX IF NOT EXISTS activity_logs_filters_idx
  ON activity_logs (division, machine_number, operator_name, start_time);
