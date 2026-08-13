# Transactional Identity Migration

This runbook moves the legacy global KV `passkeys` array into the D1 Identity model without changing
the production RP ID. It is a production data change and requires explicit authorization for the
named Cloudflare account, Pages project, D1 database, and maintenance window.

## Fixed migration contract

- The deployed RP ID remains `sightplay.xclz.org`; existing credentials are not re-registered.
- Every legacy credential becomes an active `spki` credential owned by the initial
  `legacy-owner` account. New registrations continue to store `cose` credentials.
- The complete export is runtime-decoded before any write. One malformed or duplicate item rejects
  the complete migration.
- `importLegacyIdentity()` inserts the account and all credentials in one D1 batch. A rerun succeeds
  only when every persisted field exactly matches the decoded export; any divergence is a conflict.
- Legacy KV remains read-only during verification and is removed only after the custom-domain login
  proof succeeds. The application never dual-reads or dual-writes KV and D1.

## Preconditions

1. Record the production Pages project, active deployment SHA, custom-domain mapping, current
   `WEBAUTHN_RP_ID`, KV namespace ID, and credential count.
2. Create the production D1 database, apply every migration under
   `packages/identity-server/migrations/`, and bind it to the Pages project as `IDENTITY_DB`.
3. Configure the non-secret Identity variables in `wrangler.toml` and retain `GEMINI_API_KEY` as a
   platform secret. Do not recreate `JWT_SECRET` or `AUTH_STORE` application bindings.
4. Export only the KV `passkeys` value to a private temporary file outside the repository. Do not put
   the export in chat, logs, source control, CI artifacts, shell history, or environment variables.

Validate the exact bytes offline through stdin:

```sh
pnpm identity:migration:validate < /private/path/passkeys.json
```

Record only the reported count and SHA-256 fingerprint. The validator never prints public keys or
credential IDs.

## Pre-production rehearsal gate

Do not begin the production maintenance window merely because Cloudflare reports a successful artifact
deployment. Use the separate project and data boundary defined in the
[Cloudflare environment contract](cloudflare-environments.md), then prove the named PPE environment:

1. Record the `sightplay-ppe` deployment of `develop`, isolated D1 database, binding scope, and
   `https://develop.sightplay.xclz.org`. The origin must be explicitly allowed and compatible with RP ID
   `sightplay.xclz.org`; a `pages.dev` hostname is delivery evidence only.
2. Apply the same migrations to the PPE D1 database and bind it as `IDENTITY_DB` only in that environment.
   Require `GET /api/auth/session` to return a valid anonymous success envelope; a structured 500 means the
   runtime is not ready even if the deployment check is green.
3. On the PPE custom domain, use the one-time bootstrap capability described in the environment contract
   to issue the first disposable invitation. Register the first account, remove the bootstrap secret, prove
   the capability is closed, then prove session refresh, logout, Passkey login, authenticated invitation
   creation, credential listing, non-final removal, and final-credential rejection. Record browser,
   authenticator, URL, and deployment SHA, but never the invitation code or credential material.
4. Rehearse `importLegacyIdentity()` with a non-production fixture that has the same decoded schema. Prove
   first-run import, exact idempotent rerun, count/fingerprint comparison, and rollback from an induced late
   failure without copying production credentials into PPE.

PPE evidence proves binding, schema, application wiring, WebAuthn origin/RP policy, and the operational
procedure. It does not prove that the production export is valid or authorize a production data change.
Proceed only after the named production account/project/database and maintenance window are explicitly
approved.

## Authorized execution

1. Put the application in a short registration/login maintenance window so the KV export cannot
   change after validation.
2. In a temporary D1-bound administrative executor, parse the private export with
   `decodeLegacyCredentialExport()` and pass its value directly to `importLegacyIdentity()`. Do not
   expose this executor as a public route or add a permanent migration API.
3. Verify the returned result is `{ imported: true }` on the first run. Rerun once and require
   `{ imported: false }`; any other result aborts the rollout.
4. Compare D1 active credential count and the private export fingerprint/count. Do not log credential
   material.

## Runtime proof and rollback

Deploy the application with `IDENTITY_DB`, then use `https://sightplay.xclz.org` to prove, in order:
existing-passkey login, session refresh, invitation creation, new-account registration, credential
listing, removal of a non-final credential, final-credential rejection, logout, and rejected session
reuse. A `pages.dev` URL or localhost cannot prove the production credential boundary.

If any proof fails, roll the Pages deployment back to the prior SHA while preserving the untouched KV
snapshot and D1 database for diagnosis. Do not translate new D1 sessions back into legacy JWTs. After
the full proof window passes, remove the temporary executor and retire the KV namespace binding; keep
the private export only for the approved retention period, then delete it through the organization's
recoverable-data procedure.
