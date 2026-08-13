# Identity, Data, and Security Architecture

Status: target

## Product identity

An invitation creates an independent SightPlay account. Adding a Passkey to an existing account is an
authenticated credential-management operation and does not consume a create-account invitation. This
replaces the implicit global `owner` identity with explicit `AccountId` and `CredentialId` ownership.

## Domain records

The transactional identity store owns these conceptual records:

| Record     | Required semantics                                                                          |
| ---------- | ------------------------------------------------------------------------------------------- |
| Account    | stable principal identity and lifecycle                                                     |
| Credential | unique credential ID, account owner, public key, algorithm, monotonic counter, revocation   |
| Invitation | hashed code, purpose, issuer, optional target, expiry, one-time consumption                 |
| Ceremony   | hashed challenge, kind, account/invite binding, RP ID, allowed origin, expiry, one-time use |
| Session    | hashed opaque token, account owner, expiry, revocation                                      |

Raw invitation codes, session tokens, and challenges are not stored as retrievable secrets. Repository
interfaces expose atomic domain commands, not generic key/value operations.

## Atomic commands

- `completeRegistration` consumes one valid registration ceremony and one valid invitation, creates
  the account and credential, and creates a session in one transaction.
- `completeLogin` consumes one valid authentication ceremony, verifies and advances the credential
  counter, and creates a session in one transaction.
- `addCredential` consumes an authenticated ceremony and inserts a credential owned by that account.
- `removeCredential` refuses to remove the final active credential and commits atomically.
- Reusing a ceremony, invitation, credential ID, or session token digest fails deterministically.

Workers KV may remain suitable for caches or low-risk preferences, but it cannot implement this
contract. The first Cloudflare adapter should use D1 constraints and transactional statements; use a
Durable Object serialization boundary if an identity invariant cannot be proven with that adapter.

## Transport boundary

HTTP routes only authenticate, decode a shared runtime schema, invoke one application use case, and
encode a shared result:

```ts
type ApiResult<T, Code extends string> =
  | { ok: true; data: T; requestId: string }
  | { ok: false; error: { code: Code; retryable: boolean }; requestId: string };
```

Server error codes are stable and non-localized. The client maps them to localized copy and recovery.
Provider messages, stack traces, and arbitrary JSON never become product state.

## WebAuthn and session policy

- RP ID and allowed origins are validated startup configuration, not inferred trust from arbitrary
  request headers.
- Every ceremony binds kind, expected origin, RP ID, expiry, and relevant account or invitation.
- Registration and authentication validate the exact configured origin policy and required user
  verification policy.
- Sessions are opaque, revocable, server-side records delivered through Secure, HttpOnly, SameSite
  cookies. Logout revokes the session before clearing the cookie.
- Preview Passkey evidence uses an HTTPS custom domain compatible with the configured RP ID. Localhost
  can prove a separate development RP or a fake client, not production credential compatibility.

## Operational security

- Replace the public error-report store with authenticated, sanitized telemetry carrying request,
  operation, release, and environment identifiers.
- Do not accept credentialed wildcard CORS. Same-origin endpoints are the default; any explicit
  cross-origin surface uses an allowlist and CSRF analysis.
- Rate limits are dedicated ports with policies per ceremony, invite, account, and source address;
  they are not incidental KV keys.
- The D1 rate-limit adapter admits each attempt with one atomic upsert. Subjects are digested before
  persistence, Cloudflare supplies the trusted client address at the platform boundary, and use cases
  select the source, ceremony, invitation, or account policy before creating protected state.
- Secrets remain platform bindings. Logs contain stable codes and identifiers, never credential
  material, invitation codes, session tokens, raw AI prompts, or unredacted user input.
