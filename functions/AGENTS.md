# Cloudflare Pages Functions

- Keep route files as thin Cloudflare adapters: call the shared `edge-functions/` handler through
  `createCloudflareContext`; do not duplicate product logic or use EdgeOne request types here.
- Re-export a shared handler's `onRequestOptions` when it has one so every deployed route preserves
  its CORS behavior.
