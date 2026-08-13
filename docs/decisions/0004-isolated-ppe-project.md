# 0004 — Isolate Identity PPE in a Separate Pages Project

Status: accepted

Date: 2026-08-13

## Context

The production Cloudflare Pages project has one production configuration and one preview
configuration. Every non-production branch uses the preview configuration. Binding a durable Identity
database there would expose the same data capability to ordinary pull-request deployments, while using
production Identity data would make destructive rehearsal unsafe.

SightPlay previously attempted to use `develop.sightplay.xclz.org` as a branch alias in the production
Pages project and shared the legacy authentication KV. That domain no longer exists, and shared Identity
storage contradicts the transactional migration and rollback contract.

## Decision

Use two Pages projects:

- `sightplay` serves production from `main` at `sightplay.xclz.org`. Its pull-request previews have no
  Identity database binding and are delivery evidence only.
- `sightplay-ppe` serves the trusted `develop` branch at `develop.sightplay.xclz.org`. It has its own D1
  database, secrets, allowed origin, and disposable Identity data. Its preview configuration has no
  Identity database binding.

Both custom domains use RP ID `sightplay.xclz.org`. An authenticator may therefore offer a credential on
either origin, but each server accepts only credential records in its own database. PPE accounts and
credential records remain disposable, and production credential material is never copied into PPE.

## Consequences

- A pull-request preview cannot read or mutate persistent PPE or production Identity data.
- PPE has a stable HTTPS origin that can prove the real WebAuthn RP boundary before production release.
- There is one additional Pages project and D1 database to provision and operate.
- A `*.pages.dev` deployment remains useful for artifact and routing smoke checks, but never proves
  Passkey compatibility or transactional deployment readiness.

## Verification

Inventory both Pages projects and require their production branches, custom domains, D1 bindings, and
allowed origins to match the environment contract. On PPE, prove anonymous session success, a disposable
Passkey lifecycle, migration idempotency, and rollback. On the production project's pull-request preview,
require Identity requests to fail closed without a database rather than silently sharing PPE data.
