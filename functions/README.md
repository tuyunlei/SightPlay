# Cloudflare Pages Functions (placeholder)

This directory is reserved for Cloudflare Pages Functions file-based routing.

## Current status

- Not active yet.
- Runtime endpoints currently use EdgeOne handlers under `edge-functions/`.

## Migration note (future step)

When migrating endpoints to Cloudflare Pages Functions:

1. Copy endpoint logic into this `functions/` directory using file-based routes.
2. Replace platform adapter usage from `createEdgeOneContext(...)` to `createCloudflareContext(...)`.
