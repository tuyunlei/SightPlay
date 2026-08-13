# Cloudflare Environment Contract

Cloudflare deployment checks prove that an artifact was built and routed. Identity readiness additionally
requires the correct project, custom domain, database binding, schema, origin policy, and runtime behavior.

## Topology

| Environment          | Pages project   | Production branch | Public origin                         | Identity data                       |
| -------------------- | --------------- | ----------------- | ------------------------------------- | ----------------------------------- |
| Production           | `sightplay`     | `main`            | `https://sightplay.xclz.org`          | Production D1, migration-controlled |
| PPE                  | `sightplay-ppe` | `develop`         | `https://develop.sightplay.xclz.org`  | Isolated disposable D1              |
| Pull-request preview | `sightplay`     | none              | generated `*.sightplay.pages.dev` URL | No Identity binding                 |

The separate PPE project is required by [Decision 0004](../decisions/0004-isolated-ppe-project.md).
Cloudflare Pages applies one preview binding set to every non-production branch; therefore a persistent
PPE database must not be attached to the production project's preview configuration.

## Configuration ownership

- `wrangler.toml` owns versioned, non-secret runtime defaults.
- Pages project configuration owns environment-specific D1 and secret bindings.
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
4. The production project's pull-request preview has no Identity D1 binding.

The read-only remote smoke command remains appropriate for generated previews, but it cannot replace any
of these proofs.

## PPE provisioning plan

Provisioning requires an explicitly approved Cloudflare token scoped to the SightPlay account and
`xclz.org` zone with Pages Write, D1 Write, and DNS Edit. The operator consumes it from the approved secret
store; the value never enters source, chat, command arguments, logs, or an environment file.

1. Create D1 database `sightplay-identity-ppe` and apply every checked-in Identity migration.
2. Create Git-integrated Pages project `sightplay-ppe` from `tuyunlei/SightPlay`, with production branch
   `develop`, the repository build contract, and automatic preview branch deployments disabled.
3. Configure only the project's production environment with `IDENTITY_DB`, Identity variables, and required
   secrets. Leave its preview environment without Identity storage.
4. Complete one successful `develop` deployment, attach `develop.sightplay.xclz.org`, and require active
   domain verification and certificate validation before changing DNS routing.
5. Run the required evidence above and record only resource identifiers and results. If any step fails,
   remove or disable the new PPE resources without touching the existing `sightplay` project.

Cloudflare documents the relevant controls in its guides for
[Pages bindings](https://developers.cloudflare.com/pages/functions/bindings/),
[branch deployment controls](https://developers.cloudflare.com/pages/configuration/branch-build-controls/),
and [custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/). The API
requires Pages Write to create a project and D1 Write to create a database.
