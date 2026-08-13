# Cloudflare Environment Contract

Cloudflare deployment checks prove that an artifact was built and routed. Identity readiness additionally
requires the correct project, custom domain, database binding, schema, origin policy, and runtime behavior.

## Topology

| Environment          | Pages project | Pages environment | Public origin                         | Identity data                       |
| -------------------- | ------------- | ----------------- | ------------------------------------- | ----------------------------------- |
| Production           | `sightplay`   | production        | `https://sightplay.xclz.org`          | Production D1, migration-controlled |
| PPE                  | `sightplay`   | preview           | `https://develop.sightplay.xclz.org`  | Disposable PPE D1                   |
| Pull-request preview | `sightplay`   | preview           | generated `*.sightplay.pages.dev` URL | Same disposable PPE D1              |

[Decision 0004](../decisions/0004-shared-preview-ppe.md) keeps the existing single-project topology.
Cloudflare Pages applies one preview binding set to every non-production branch, so `develop` and pull-request
previews share the PPE database. Only the stable custom origin is admitted for Identity mutations.

## Configuration ownership

- `wrangler.toml` owns versioned, non-secret runtime defaults.
- `wrangler.toml` owns environment-specific D1 bindings and non-secret variables.
- Cloudflare DNS and Pages custom-domain configuration jointly own the HTTPS origin.
- `packages/identity-server/migrations/` is the only schema history.
- [The Identity migration runbook](identity-migration.md) owns rehearsal, production cutover, and rollback.

Do not infer readiness from any one surface. Record the Git SHA, Pages deployment ID, project name,
production branch, custom-domain status, D1 database ID, applied migration set, and runtime proof together.
Never record secret values, credential material, invitation codes, or session tokens.

## Required evidence

Production release remains separately authorized. Before it, PPE must prove:

1. `GET /api/auth/session` returns a valid anonymous success envelope through the custom domain.
2. A disposable invitation completes registration, refresh, logout, login, credential listing,
   non-final removal, and final-credential rejection with a real Passkey.
3. The synthetic legacy fixture imports once, reruns idempotently, and rolls back on an induced late
   failure without production data.
4. A generated pull-request origin cannot perform credentialed Identity mutations against the PPE D1.

The read-only remote smoke command remains appropriate for generated previews, but it cannot replace any
of these proofs.

## PPE provisioning plan

Provision through Wrangler OAuth, a scoped API token, or the Cloudflare dashboard. Authentication is an
operator concern, not a deployment prerequisite; Git integration remains the deployment owner.

1. Create D1 databases `sightplay-identity-production` and `sightplay-identity-ppe`, then apply every
   checked-in Identity migration to each. Do not import or bind production credentials during PPE setup.
2. Configure the existing project's production and preview environments with distinct `IDENTITY_DB`
   bindings. Allow only `sightplay.xclz.org` in production and `develop.sightplay.xclz.org` in preview.
3. Add a high-entropy preview `IDENTITY_BOOTSTRAP_SECRET` only for initial PPE account creation.
4. Complete one successful `develop` deployment, attach `develop.sightplay.xclz.org`, and require active
   domain verification and certificate validation before changing DNS routing.
5. Call `POST /api/auth/bootstrap/invitations` through the PPE custom origin with the secret supplied from
   the approved secret store in `X-Identity-Bootstrap-Secret`. Use the returned invitation immediately to
   register the first account, then remove `IDENTITY_BOOTSTRAP_SECRET` and prove that the bootstrap endpoint
   returns `authenticationRequired`. Generate every later invitation through the authenticated account API.
6. Run the required evidence above and record only resource identifiers and results. If any step fails,
   remove the preview binding or reset the PPE database without changing the production binding.

Cloudflare documents the relevant controls in its guides for
[Pages bindings](https://developers.cloudflare.com/pages/functions/bindings/),
[branch deployment controls](https://developers.cloudflare.com/pages/configuration/branch-build-controls/),
and [custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/). The API
requires Pages Write to create a project and D1 Write to create a database.
