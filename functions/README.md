# Cloudflare Pages Functions

This directory provides the deployed file-based `/api/*` routes for Cloudflare Pages. Each route is a
thin Cloudflare adapter over a shared handler in `edge-functions/`; runtime configuration, including
the WebAuthn RP ID, lives in `wrangler.toml`.

See [`AGENTS.md`](AGENTS.md) before changing a route boundary.
