CREATE TABLE identity_rate_limits (
  scope TEXT NOT NULL CHECK (scope IN ('source', 'ceremony', 'invitation', 'account')),
  subject_digest TEXT NOT NULL,
  window_started_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL CHECK (attempts > 0),
  PRIMARY KEY (scope, subject_digest)
);

CREATE INDEX identity_rate_limits_window
  ON identity_rate_limits(window_started_at);
