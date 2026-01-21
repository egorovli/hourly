-- migrate:up

-- Create enum types
CREATE TYPE audit_log_action_type AS ENUM (
  'authentication',
  'authorization',
  'data-modification',
  'data-read',
  'configuration',
  'integration',
  'administration'
);

CREATE TYPE audit_log_outcome AS ENUM ('success', 'failure', 'pending');

CREATE TYPE audit_log_target_resource_type AS ENUM (
  'session', 'token', 'profile', 'worklog', 'issue',
  'project', 'integration', 'preferences', 'audit-log'
);

CREATE TYPE audit_log_severity AS ENUM (
  'debug', 'info', 'warning', 'error', 'critical'
);

-- Main table (partitioned by month)
CREATE TABLE audit_logs (
  id                    text NOT NULL,
  occurred_at           timestamptz NOT NULL DEFAULT now(),

  -- Actor (nullable for anonymous/failed auth)
  actor_profile_id      text,
  actor_provider        text,

  -- Action
  action_type           audit_log_action_type NOT NULL,
  action_description    text NOT NULL,
  severity              audit_log_severity NOT NULL DEFAULT 'info',

  -- Target
  target_resource_type  audit_log_target_resource_type NOT NULL,
  target_resource_id    text,

  -- Result
  outcome               audit_log_outcome NOT NULL,

  -- Correlation
  correlation_id        text NOT NULL,
  session_id            text,
  request_id            text NOT NULL,

  -- Request context
  request_path          text NOT NULL,
  request_method        text NOT NULL,
  ip_address            text,
  user_agent            text,

  -- Performance & hierarchy
  duration_ms           integer,
  parent_event_id       text,
  sequence_number       integer,

  -- Extensible metadata (JSONB)
  metadata              jsonb,

  -- Append-only: created_at only, NO updated_at
  created_at            timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (id, occurred_at)
) PARTITION BY RANGE (occurred_at);

CREATE SCHEMA audit;

-- Create partitions for current + next 3 months
CREATE TABLE audit.logs_2026_01 PARTITION OF public.audit_logs
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE audit.logs_2026_02 PARTITION OF public.audit_logs
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

CREATE TABLE audit.logs_2026_03 PARTITION OF public.audit_logs
  FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

CREATE TABLE audit.logs_2026_04 PARTITION OF public.audit_logs
  FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');

CREATE TABLE audit.logs_2026_05 PARTITION OF public.audit_logs
  FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');

CREATE TABLE audit.logs_2026_06 PARTITION OF public.audit_logs
  FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');

CREATE TABLE audit.logs_2026_07 PARTITION OF public.audit_logs
  FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');

CREATE TABLE audit.logs_2026_08 PARTITION OF public.audit_logs
  FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');

CREATE TABLE audit.logs_2026_09 PARTITION OF public.audit_logs
  FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');

CREATE TABLE audit.logs_2026_10 PARTITION OF public.audit_logs
  FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');

CREATE TABLE audit.logs_2026_11 PARTITION OF public.audit_logs
  FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');

CREATE TABLE audit.logs_2026_12 PARTITION OF public.audit_logs
  FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');

CREATE TABLE audit.logs_default PARTITION OF public.audit_logs DEFAULT;

-- Indexes
CREATE INDEX idx_audit_logs_actor
  ON audit_logs (actor_profile_id, actor_provider, occurred_at DESC);

CREATE INDEX idx_audit_logs_action_type
  ON audit_logs (action_type, occurred_at DESC);

CREATE INDEX idx_audit_logs_correlation
  ON audit_logs (correlation_id, occurred_at);

CREATE INDEX idx_audit_logs_session
  ON audit_logs (session_id, occurred_at DESC) WHERE session_id IS NOT NULL;

CREATE INDEX idx_audit_logs_severity_alert
  ON audit_logs (severity, occurred_at DESC)
  WHERE severity IN ('warning', 'error', 'critical');

CREATE INDEX idx_audit_logs_admin_filter
  ON audit_logs (action_type, outcome, target_resource_type, occurred_at DESC);


-- MANDATORY: Prevent modifications (tamper-resistant)
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs are immutable - UPDATE and DELETE are not allowed';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_immutable
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_modification();

-- migrate:down
DROP TABLE audit_logs CASCADE;
DROP FUNCTION prevent_audit_log_modification();
DROP TYPE audit_log_action_type;
DROP TYPE audit_log_outcome;
DROP TYPE audit_log_target_resource_type;
DROP TYPE audit_log_severity;
DROP SCHEMA audit;
