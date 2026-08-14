# Cloudflare Pages Functions

This directory provides Cloudflare Pages' hosting-required adapter. One optional catch-all route delegates
every `/api/*` method to `_handler.ts`; routing, method admission, OPTIONS behavior, and product handlers
belong to `@sightplay/server-application`. Runtime configuration, including the WebAuthn RP ID, lives in
`wrangler.toml`.

The boundary is enforced by `pnpm run lint:fitness`; repository-wide operating constraints live in the
[root `AGENTS.md`](../AGENTS.md), and the ownership contract is documented in
[`docs/architecture/module-contracts.md`](../docs/architecture/module-contracts.md).
