# 0004 — Use the Pages Preview Environment as PPE

Status: accepted

Date: 2026-08-13

## Context

SightPlay is a single-operator project whose existing Cloudflare Pages project automatically deploys
`main`, `develop`, and pull-request branches. Real Passkey rehearsal needs a stable HTTPS subdomain under
`sightplay.xclz.org` and disposable data isolated from production. Cloudflare Pages provides one preview
configuration shared by every non-production branch; it does not provide branch-specific bindings.

## Decision

Keep one Pages project. Its production environment binds the production Identity D1 database. Its preview
environment binds one disposable PPE D1 database shared by `develop` and generated pull-request previews.
`develop.sightplay.xclz.org` points to the latest `develop` branch deployment and is the only preview origin
allowed to perform Identity mutations or claim real Passkey compatibility.

Do not put production credentials in PPE. Treat PPE data as resettable, and do not rely on it for durable
test records. Split PPE into a separate project only if untrusted contributors gain preview execution,
preview data becomes sensitive or durable, or concurrent branches require independent schemas.

## Consequences

- Git integration continues to own all deployments; no second Pages project or deployment workflow exists.
- Production and preview Identity data remain isolated, while all preview branches share the same PPE data.
- Pull-request code can reach the disposable PPE binding, but origin policy prevents its generated
  `pages.dev` hostname from performing credentialed Identity mutations.
- A generated `pages.dev` URL proves artifact and route delivery, not the WebAuthn RP boundary.

## Verification

Inventory the one Pages project and require distinct production and preview `IDENTITY_DB` bindings. Prove
the real Passkey lifecycle through `develop.sightplay.xclz.org`; require generated preview origins to be
rejected for Identity mutations and never copy production credential material into the PPE database.
