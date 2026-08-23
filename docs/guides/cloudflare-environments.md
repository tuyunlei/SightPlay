# Cloudflare Environment Contract

Cloudflare deployment checks prove that an artifact was built and routed. Identity readiness additionally
requires the correct project, database binding, schema, RP ID, origin policy, and runtime behavior.

## Topology

| Environment          | Pages project | Pages environment | Public origin                         | RP ID                 | Identity data                       |
| -------------------- | ------------- | ----------------- | ------------------------------------- | --------------------- | ----------------------------------- |
| Production           | `sightplay`   | production        | `https://sightplay.xclz.org`          | `sightplay.xclz.org`  | Production D1, migration-controlled |
| Pull-request preview | `sightplay`   | preview           | generated `*.sightplay.pages.dev` URL | `sightplay.pages.dev` | Disposable PPE D1                   |

[Decision 0004](../decisions/0004-shared-preview-ppe.md) keeps the existing single-project topology.
Cloudflare Pages applies one preview binding set to every non-production branch, so pull-request previews
share the PPE database. Identity admits canonical HTTPS subdomains of the SightPlay Pages project and
rejects the Pages apex, other projects, insecure origins, ports, paths, and suffix-confusion hostnames.

## Configuration ownership

- `wrangler.toml` owns versioned, non-secret runtime defaults.
- `wrangler.toml` owns environment-specific D1 bindings and non-secret variables.
- Pages Git integration owns generated preview origins; Cloudflare DNS and Pages custom-domain configuration
  own the production origin.
- `packages/identity-server/migrations/` is the only schema history.
- [The Identity migration runbook](identity-migration.md) owns rehearsal, production cutover, and rollback.

Do not infer readiness from any one surface. Record the Git SHA, Pages deployment ID, project name,
production branch, custom-domain status, D1 database ID, applied migration set, and runtime proof together.
Never record secret values, credential material, invitation codes, or session tokens.

## Required evidence

Production release remains separately authorized. Before it, PPE must prove:

1. `GET /api/auth/session` returns a valid anonymous success envelope through the generated Preview URL.
2. A disposable invitation completes registration, refresh, logout, login, credential listing,
   non-final removal, and final-credential rejection with a real Passkey.
3. The synthetic legacy fixture imports once, reruns idempotently, and rolls back on an induced late
   failure without production data.
4. WebAuthn options returned through Preview use RP ID `sightplay.pages.dev`; a foreign Pages project origin
   is rejected before it can mutate PPE D1.

The read-only remote smoke command remains appropriate for generated previews, but it cannot replace any
of these proofs.

## Invite CLI

After signing in once, Account Management can issue a revocable Invite CLI credential. Copy it directly
to macOS Keychain without placing it in shell history:

```bash
pbpaste | pnpm identity:invite -- save --env preview
pnpm identity:invite -- create --env preview --url https://<deployment>.sightplay.pages.dev
```

Production uses a separately issued credential and defaults to `https://sightplay.xclz.org`. Replacing or
revoking a credential in Account Management invalidates the Keychain copy; it must then be replaced or
deleted locally. The CLI prints a newly created invitation exactly once.

## PPE provisioning plan

Provision through Wrangler OAuth, a scoped API token, or the Cloudflare dashboard. Authentication is an
operator concern, not a deployment prerequisite; Git integration remains the deployment owner.

1. Create D1 databases `sightplay-identity-production` and `sightplay-identity-ppe`, then apply every
   checked-in Identity migration to each. Do not import or bind production credentials during PPE setup.
2. Configure the existing project's production and preview environments with distinct `IDENTITY_DB`
   bindings. Production uses exact origin and RP ID `sightplay.xclz.org`; Preview uses HTTPS subdomains of
   `sightplay.pages.dev` and RP ID `sightplay.pages.dev`.
3. Add a high-entropy preview `IDENTITY_BOOTSTRAP_SECRET` only for initial PPE account creation.
4. Complete one successful pull-request deployment and record its generated `*.sightplay.pages.dev` URL.
5. Call `POST /api/auth/bootstrap/invitations` through that generated URL with the secret supplied from
   the approved secret store in `X-Identity-Bootstrap-Secret`. Use the returned invitation immediately to
   register the first account, then remove `IDENTITY_BOOTSTRAP_SECRET` and prove that the bootstrap endpoint
   returns `authenticationRequired`. Redeploy without the secret and remove secret-bearing old deployments.
   Generate every later invitation through the authenticated account API.
6. Run the required evidence above and record only resource identifiers and results. If any step fails,
   remove the preview binding or reset the PPE database without changing the production binding.

Cloudflare documents the relevant controls in its guides for
[Pages bindings](https://developers.cloudflare.com/pages/functions/bindings/),
[branch deployment controls](https://developers.cloudflare.com/pages/configuration/branch-build-controls/),
and [preview deployments](https://developers.cloudflare.com/pages/configuration/preview-deployments/).
