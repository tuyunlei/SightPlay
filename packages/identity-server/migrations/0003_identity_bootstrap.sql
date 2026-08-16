CREATE TABLE identity_bootstrap_claims (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  claimed_at INTEGER NOT NULL
);

CREATE TRIGGER validate_identity_bootstrap_claim
BEFORE INSERT ON identity_bootstrap_claims
BEGIN
  SELECT (CASE WHEN
    EXISTS (SELECT 1 FROM accounts) OR
    EXISTS (SELECT 1 FROM invitations)
  THEN RAISE(ABORT, 'identity store is not empty') END);
END;
