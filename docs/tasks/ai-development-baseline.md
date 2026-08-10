# AI Development Baseline

Status: complete

Branch: `codex/ai-development-baseline`

Base: `origin/develop` at `033e1fe`

## Goal

Make SightPlay easier for AI agents to change correctly by governing repository context, separating
practice decisions from runtime effects, making external services injectable, and replacing
implementation-coupled tests with behavior and contract evidence.

## Non-goals

- Product behavior, UX, MIDI hardware, or microphone-quality audit.
- A new generic state-management framework or migration away from Zustand.
- Production deployment, secrets, or `develop` to `main` release work.
- Creating a large catalog of speculative scoped AGENTS files or Skills.

## Work and progress

### Batch 1 — Context governance

- [x] Define terse root `AGENTS.md` rules and remove stale inventory/status content.
- [x] Add AGENTS admission, placement, and deletion governance.
- [x] Document risk-based test layers and prohibited low-value test patterns.
- [x] Establish a lightweight engineering-decision template.
- [x] Reconcile README, ROADMAP, and contribution workflow with the new source-of-truth boundaries.

### Batch 2 — Practice core and runtime seams

- [x] Introduce typed practice actions and a pure state/effect reducer for the correct-note flow.
- [x] Keep Zustand as the React adapter and preserve existing public behavior.
- [x] Move animation/challenge timers behind an injectable scheduler and clock.
- [x] Inject Audio, MIDI, and AI service capabilities instead of requiring module replacement.
- [x] Strengthen dependency-cruiser rules for the new domain/runtime boundary.

### Batch 3 — Test portfolio rebalance

- [x] Add reducer tests for score, queue, both-hands, challenge, and delayed-effect decisions.
- [x] Add deterministic scheduler/service contract tests at injection seams.
- [x] Convert relevant hook tests from module mocks to injected fakes.
- [x] Delete return-shape, setter-forwarding, and duplicate implementation-wiring tests.
- [x] Preserve assembled MIDI/browser user-path evidence and document untested real boundaries.

### Verification and delivery

- [x] Frozen install.
- [x] Format, lint, typecheck, architecture/dead-code/file-size gates.
- [x] Unit/integration suite and Playwright E2E suite.
- [x] Production build and dependency audit.
- [x] Review remaining warnings, ports/processes, git diff/status, and this checklist.
- [x] Commit, push, PR to `develop`, review CI, and merge without deploying `main`.

## Decisions

- Adopt Dori's separation principles, not its Swift Store implementation. The pilot remains TypeScript
  and Zustand-compatible.
- GitHub Issues and PRs own live status after this task. This file is the execution record for the
  cross-cutting migration and becomes historical after merge.
- Coverage remains disabled. A lower test count is acceptable when removed tests protected only
  implementation shape and stronger behavior evidence remains.

## Progress log

- 2026-08-10: Created the task record; completed the initial AGENTS, test-strategy, and decision-record
  governance artifacts.
- 2026-08-10: Added the pure practice reducer/effect model, retained Zustand as adapter, injected all
  planned runtime capabilities, strengthened dependency rules, and rebalanced the unit/integration
  portfolio from 454 to 410 tests. Initial typecheck, zero-warning lint, 410 tests, and architecture
  gates passed before the full gate run.
- 2026-08-10: Full local gate passed: frozen install, formatting, zero-warning lint, typecheck,
  dependency/dead-code/file-size checks, 410 unit/integration tests, 56 Playwright tests, production
  build, and audit with no known vulnerabilities. Non-blocking output: four existing files remain above
  the file-size advisory threshold, E2E logs expected controlled MIDI/auth/error-path failures, and the
  589.80 kB minified bundle remains above Vite's 500 kB advisory. Playwright released
  `127.0.0.1:4173`; unrelated `dori-dev` PID 46229 on port 3000 was unchanged.
- 2026-08-10: Opened ready PR #4 against `develop`. GitHub Actions run `31389072277` passed
  lint/format, typecheck, architecture, 410 unit/integration tests, 56 Playwright tests, and build;
  the Cloudflare Pages preview check also passed. The authorized merge completes this task without
  updating `main` or performing a production deployment.
