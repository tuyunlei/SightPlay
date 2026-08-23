CREATE TABLE invitation_access_credentials (
  id TEXT PRIMARY KEY,
  token_digest TEXT NOT NULL UNIQUE,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  revoked_at INTEGER
);

CREATE UNIQUE INDEX invitation_access_active_account
  ON invitation_access_credentials(account_id)
  WHERE revoked_at IS NULL;
