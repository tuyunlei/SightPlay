# CI Signal Hardening

Status: in progress

Branch: `codex/ci-signal-hardening`

Base: `origin/develop` at `477a5c1`

## Goal

Make CI a small set of independent, low-noise proofs: fast deterministic quality checks, real browser
boundary tests, and side-effect-free production builds. Static gates must describe only structure they
can mechanically prove; runtime correctness remains the responsibility of behavior and contract tests.

## Scope

- [x] Consolidate format, lint, typecheck, architecture, and deterministic tests into one `quality` job.
- [x] Run `quality`, Playwright E2E, and production build in parallel.
- [x] Cancel superseded runs for the same branch or pull request.
- [x] Keep full Playwright in CI but remove it from the local pre-push hook.
- [x] Remove Sentry credentials from ordinary CI builds so verification has no external release write.
- [x] Remove file-total-line and default-export policy gates that do not prove product correctness.
- [x] Remove dependency-cruiser rules for deleted legacy source roots; retain the one-way legacy-root gate.
- [x] Clear persistent Knip configuration hints without dropping Pages or local-runtime entrypoints.
- [x] Use a pnpm-10-compatible setup action, current artifact action, and an explicit workerd install-script
      allowance instead of accepting permanent action/dependency warnings.
- [x] Replace lifecycle and ingress AST claims that admitted no-op implementations or rejected unrelated
      typed code; retain structural boundaries and rely on existing runtime/adapter behavior suites.
- [x] Pass the complete local deterministic gate without warnings.
- [x] Pass the full local Playwright and side-effect-free build evidence.
- [ ] Pass the new GitHub Actions workflow without persistent configuration warnings.
- [ ] After the new check names exist on `develop`, configure branch protection for `develop` and `main`
      as a separately reviewed repository operation.

## Proof ownership

| Proof                                                    | Owner                   | Failure means                                                       |
| -------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------- |
| Formatting, lint, typecheck, package boundaries, unit/D1 | `quality`               | deterministic source or contract regression                         |
| Browser assembly, WebAuthn, WebMIDI, Web Audio, handlers | `e2e`                   | browser or system-boundary regression                               |
| Web and Pages Functions artifacts                        | `build`                 | the production artifacts cannot be constructed                      |
| Runtime cancellation and late-result rejection           | feature runtime tests   | behavior contract failed; static lifecycle metadata is not evidence |
| External payload acceptance/rejection                    | codec and adapter tests | trust-boundary behavior failed; AST admission shape is not evidence |

## Progress

- 2026-08-14: Audited `origin/develop` and confirmed six repeated installs, build serialized behind E2E,
  complete local/remote test duplication, permanent file-size/Knip warnings, semantic false assurance in
  lifecycle/ingress AST checks, CI-time Sentry upload credentials, and no branch protection or rulesets.
- 2026-08-14: Implemented the source/config cleanup. Focused `lint:fitness` passes both fixtures and the
  live repository; `lint:dead` now passes with no configuration hints while retaining root runtime
  entrypoints. The shared `verify:fast` entry then passed format, zero-warning lint, three TypeScript
  projects, 282-module dependency analysis, structural fitness fixtures, Knip, 276 regular tests, and 19
  workerd/D1 tests in 19.2 seconds. Slow-boundary and remote workflow evidence remained pending at this
  checkpoint.
- 2026-08-14: The two slow proofs ran in parallel: production web/Pages Functions build passed without
  Sentry credentials, and Playwright passed 51 scenarios with the documented WebKit virtual-WebAuthn case
  skipped. Local output still contains the host's `NO_COLOR`/Playwright color conflict and Vite's generic
  raw-chunk advisory; neither is being relabeled as product correctness evidence. Remote workflow evidence
  remains pending.
- 2026-08-14: PR #17's first workflow proved the new topology: build finished in 25 seconds, quality in 1
  minute 26 seconds, and E2E in 3 minutes 5 seconds, all in parallel. Log review found no project
  file-size or Knip warnings, then identified three toolchain leftovers: pnpm action v6 bootstrapping pnpm
  11 before switching to pinned pnpm 10, an intentionally skipped workerd postinstall, and obsolete
  `upload-artifact@v4` runtime warnings. The follow-up pins the Node-24 pnpm v5 action compatible with pnpm
  10, explicitly allows workerd's required binary postinstall, and upgrades artifact upload to v7.
