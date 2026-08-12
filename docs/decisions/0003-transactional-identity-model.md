# 0003 — Transactional Account and Credential Identity

Status: accepted

Date: 2026-08-13

## Context

The product presents invitations as account creation, while the server uses one fixed WebAuthn user,
one fixed session subject, a global credential array, and independent KV writes for ceremony,
credential, invitation, and session state. This does not represent account ownership and cannot prove
one-time invitation, replay prevention, counter monotonicity, or rollback under concurrency.

## Decision

An invitation creates an independent Account. Adding or removing a Passkey is authenticated credential
management for that Account. Account, Credential, Invitation, WebAuthn Ceremony, and Session are
explicit records owned by a transactional IdentityStore whose interface exposes atomic use cases, not
generic key/value operations.

Use opaque revocable sessions and store only digests of bearer values. Configure allowed origins and RP
ID explicitly. D1 is the first Cloudflare adapter; if a required invariant cannot be implemented and
tested atomically, serialize the affected identity commands through a Durable Object.

## Consequences

- Product account language gains a real ownership model.
- Registration, login, replay prevention, credential counters, and final-credential protection become
  enforceable database invariants.
- Existing credentials require a controlled migration into an initial Account without changing RP ID.
- Workers KV remains available for suitable cache or preference data, not identity transactions.

## Verification

Run concurrency, replay, uniqueness, counter, rollback, session revocation, and last-credential suites
against the production IdentityStore adapter. Complete a preview-domain WebAuthn lifecycle before
production migration.
