PRAGMA foreign_keys = ON;

CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('active', 'suspended')),
  created_at INTEGER NOT NULL
);

CREATE TABLE credentials (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  public_key TEXT NOT NULL,
  public_key_format TEXT NOT NULL CHECK (public_key_format IN ('cose', 'spki')),
  algorithm TEXT NOT NULL CHECK (algorithm IN ('ES256', 'RS256', 'EdDSA')),
  counter INTEGER NOT NULL CHECK (counter >= 0),
  transports_json TEXT NOT NULL,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
  created_at INTEGER NOT NULL,
  revoked_at INTEGER
);

CREATE INDEX credentials_active_account
  ON credentials(account_id, created_at)
  WHERE revoked_at IS NULL;

CREATE TABLE invitations (
  code_digest TEXT PRIMARY KEY,
  purpose TEXT NOT NULL CHECK (purpose = 'createAccount'),
  issuer_account_id TEXT REFERENCES accounts(id),
  expires_at INTEGER NOT NULL,
  consumed_at INTEGER,
  consumed_by_account_id TEXT REFERENCES accounts(id),
  CHECK (
    (consumed_at IS NULL AND consumed_by_account_id IS NULL) OR
    (consumed_at IS NOT NULL AND consumed_by_account_id IS NOT NULL)
  )
);

CREATE TABLE ceremonies (
  id TEXT PRIMARY KEY,
  challenge_digest TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL CHECK (kind IN ('registration', 'authentication')),
  account_id TEXT,
  invitation_digest TEXT REFERENCES invitations(code_digest),
  rp_id TEXT NOT NULL,
  origin TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  consumed_at INTEGER,
  CHECK (
    (kind = 'registration' AND account_id IS NOT NULL AND invitation_digest IS NOT NULL) OR
    (kind = 'authentication' AND account_id IS NULL AND invitation_digest IS NULL)
  )
);

CREATE INDEX ceremonies_active_challenge
  ON ceremonies(challenge_digest, expires_at)
  WHERE consumed_at IS NULL;

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  token_digest TEXT NOT NULL UNIQUE,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  revoked_at INTEGER
);

CREATE INDEX sessions_active_token
  ON sessions(token_digest, expires_at)
  WHERE revoked_at IS NULL;

CREATE TABLE registration_claims (
  ceremony_id TEXT PRIMARY KEY REFERENCES ceremonies(id),
  invitation_digest TEXT NOT NULL UNIQUE REFERENCES invitations(code_digest),
  credential_id TEXT NOT NULL UNIQUE,
  claimed_at INTEGER NOT NULL
);

CREATE TRIGGER validate_registration_claim
BEFORE INSERT ON registration_claims
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1
    FROM ceremonies c
    JOIN invitations i ON i.code_digest = NEW.invitation_digest
    WHERE c.id = NEW.ceremony_id
      AND c.kind = 'registration'
      AND c.invitation_digest = NEW.invitation_digest
      AND c.consumed_at IS NULL
      AND c.expires_at > NEW.claimed_at
      AND i.purpose = 'createAccount'
      AND i.consumed_at IS NULL
      AND i.expires_at > NEW.claimed_at
  ) THEN RAISE(ABORT, 'registration precondition failed') END;
END;

CREATE TABLE authentication_claims (
  ceremony_id TEXT PRIMARY KEY REFERENCES ceremonies(id),
  credential_id TEXT NOT NULL REFERENCES credentials(id),
  next_counter INTEGER NOT NULL CHECK (next_counter >= 0),
  claimed_at INTEGER NOT NULL
);

CREATE TRIGGER validate_authentication_claim
BEFORE INSERT ON authentication_claims
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1
    FROM ceremonies c
    JOIN credentials k ON k.id = NEW.credential_id
    JOIN accounts a ON a.id = k.account_id
    WHERE c.id = NEW.ceremony_id
      AND c.kind = 'authentication'
      AND c.consumed_at IS NULL
      AND c.expires_at > NEW.claimed_at
      AND k.revoked_at IS NULL
      AND k.counter <= NEW.next_counter
      AND a.status = 'active'
  ) THEN RAISE(ABORT, 'authentication precondition failed') END;
END;

CREATE TABLE credential_revocation_claims (
  credential_id TEXT PRIMARY KEY REFERENCES credentials(id),
  account_id TEXT NOT NULL REFERENCES accounts(id),
  claimed_at INTEGER NOT NULL
);

CREATE TRIGGER validate_credential_revocation
BEFORE INSERT ON credential_revocation_claims
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1
    FROM credentials target
    WHERE target.id = NEW.credential_id
      AND target.account_id = NEW.account_id
      AND target.revoked_at IS NULL
      AND (
        SELECT COUNT(*) FROM credentials active
        WHERE active.account_id = NEW.account_id AND active.revoked_at IS NULL
      ) > 1
  ) THEN RAISE(ABORT, 'credential revocation precondition failed') END;
END;
