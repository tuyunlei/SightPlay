# 0004 — Use the Pages Preview Environment as PPE

Status: accepted

Date: 2026-08-13

## Context

SightPlay is a single-operator project whose existing Cloudflare Pages project automatically deploys
`main` and pull-request branches. Every preview receives a generated HTTPS hostname below
`sightplay.pages.dev`. Cloudflare Pages provides one preview configuration shared by every non-production
branch; it does not provide branch-specific bindings.

## Decision

Keep one Pages project. Its production environment binds the production Identity D1 database. Its preview
environment binds one disposable PPE D1 database shared by generated pull-request previews. Preview uses
RP ID `sightplay.pages.dev` and admits only canonical HTTPS subdomains of `sightplay.pages.dev`; production
uses RP ID and exact origin `sightplay.xclz.org`. Credentials are intentionally isolated between the two
RP IDs.

Do not put production credentials in PPE. Treat PPE data as resettable, and do not rely on it for durable
test records. Split PPE into a separate project only if untrusted contributors gain preview execution,
preview data becomes sensitive or durable, or concurrent branches require independent schemas.

## Consequences

- Git integration continues to own all deployments; no second Pages project or deployment workflow exists.
- Production and preview Identity data remain isolated, while all preview branches share the same PPE data.
- Pull-request previews can exercise the real WebAuthn boundary on their generated Pages origins, but can
  create only PPE credentials and mutate only disposable PPE data.
- Preview execution must remain limited to trusted repository branches. If untrusted contributors receive
  preview execution, restrict branch deployment or introduce stronger PPE isolation before accepting them.

## Verification

Inventory the one Pages project and require distinct production and preview `IDENTITY_DB` bindings. Prove
the disposable Passkey lifecycle through a generated `*.sightplay.pages.dev` deployment and require its
returned WebAuthn options to use RP ID `sightplay.pages.dev`. Prove production credential compatibility
only through `sightplay.xclz.org`; never copy production credential material into the PPE database.
