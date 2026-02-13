# Sentry Sourcemap Upload Configuration

## Overview

SightPlay is configured to automatically upload sourcemaps to Sentry during production builds. This enables proper error stack traces in Sentry when errors occur in production.

## Setup

### 1. Get Your Sentry Auth Token

1. Go to [Sentry Auth Tokens](https://sentry.io/settings/account/api/auth-tokens/)
2. Click "Create New Token"
3. Name it something like "SightPlay CI/CD"
4. Required scopes:
   - `project:read`
   - `project:releases`
   - `org:read`
5. Click "Create Token" and copy the token

### 2. Configure Environment Variables

Create a `.env` file in the project root (or add to your existing `.env`):

```bash
SENTRY_AUTH_TOKEN=your_token_here
SENTRY_ORG=your_org_slug
SENTRY_PROJECT=sightplay
```

You can find your org slug in your Sentry URL: `https://sentry.io/organizations/{org-slug}/`

### 3. Build and Deploy

When you run `pnpm build` (or `vite build`) with these environment variables set, sourcemaps will automatically be:

1. Generated during the build
2. Uploaded to Sentry
3. Associated with the current release

## CI/CD Setup

For GitHub Actions or other CI/CD platforms, add these as secrets/environment variables:

- `SENTRY_AUTH_TOKEN`
- `SENTRY_ORG`
- `SENTRY_PROJECT`

## Notes

- Sourcemap upload only happens in **production builds** (`mode === 'production'`)
- If `SENTRY_AUTH_TOKEN` is not set, the build will still succeed but sourcemaps won't be uploaded
- Sourcemaps are never committed to git (excluded in `.gitignore`)
- The Sentry plugin will create a release with version based on your git commit SHA

## Troubleshooting

If sourcemap upload fails:

1. Check that your auth token has the required scopes
2. Verify your org and project slugs are correct
3. Make sure you're running a production build: `pnpm build` (not `pnpm dev`)
4. Check the build output for Sentry plugin logs

## Resources

- [Sentry Vite Plugin Docs](https://docs.sentry.io/platforms/javascript/sourcemaps/uploading/vite/)
- [Sentry Auth Tokens](https://docs.sentry.io/api/auth/)
