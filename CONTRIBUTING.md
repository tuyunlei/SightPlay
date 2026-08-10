# Contributing Guide

## Branches and pull requests

- `main` is the production branch. Do not update or deploy it without an explicit release decision.
- `develop` is the integration branch.
- Create a disposable feature branch from current `develop`. Human branches use
  `feature/<scope>-<description>`; Codex worktrees use `codex/<description>`.
- Every change enters `develop` through a reviewed pull request. Do not merge a feature branch into a
  local `develop` and push it directly.
- Keep one coherent change in a PR. Split unrelated work, but keep coupled code, contract, documentation,
  and tests together.

GitHub Issues and PRs are the live work ledger. Do not maintain the same status in ROADMAP, a task
document, and an issue. ROADMAP records durable project milestones; a task document may retain the
decisions and verification record of a large cross-cutting migration.

## Local validation

Use the pinned versions in `.node-version` and `package.json`, then run the gates relevant to the change.
Before requesting merge, run the complete CI-equivalent set:

```bash
pnpm install --frozen-lockfile
pnpm run format:check
pnpm run lint
pnpm run typecheck
pnpm run lint:arch
pnpm run test:ci
pnpm run test:e2e
pnpm run build
pnpm audit
```

CI does not collect or gate line coverage. Follow [`docs/guides/testing-strategy.md`](docs/guides/testing-strategy.md):
tests must protect observable behavior, decisions, contracts, or known regressions.

## Commits

Use a concise conventional prefix:

- `feat:` product capability
- `fix:` defect correction
- `refactor:` behavior-preserving architecture change
- `test:` test-only change
- `chore:` toolchain or configuration
- `docs:` documentation
- `style:` formatting without behavior changes
