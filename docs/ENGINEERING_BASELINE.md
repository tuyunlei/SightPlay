# Engineering Revival Baseline

## Scope

This baseline restores reproducible local and CI development after the project hiatus. It covers
the JavaScript toolchain, dependency security, local server isolation, static analysis, tests, and
build reproducibility. It does not audit product behavior, real MIDI hardware, microphone quality,
production deployment, or infrastructure secrets.

## Decisions

- Pin Node 24.18.0 in `.node-version` and pnpm 10.34.5 in `package.json`; CI consumes both pins.
- Upgrade Vite 6 to 8 and Vitest 2 to 4 with their matching plugins. Vitest 4 required constructor
  mocks to use constructable functions; no runtime audio or MIDI behavior changed.
- Do not collect or gate on code coverage in CI. Coverage targets incentivized tests coupled to
  static text, prompts, configuration shape, and implementation details; tests must instead protect
  observable behavior, important boundaries, or known regression risks.
- Upgrade the maintained lint, architecture, DOM-test, and Git-hook toolchain. Keep ESLint 9 and
  Knip 5 rather than adopting their new policy majors in the same change, and retain the two
  established React Hooks gates (`rules-of-hooks` and `exhaustive-deps`) instead of silently
  enabling new policy rules.
- Use the Vite 8 React Compiler integration (`reactCompilerPreset` with Rolldown Babel). The three
  pre-existing Compiler warnings were removed with local side-effect helpers and test recorders.
- Bind development to `127.0.0.1:5173` by default. Playwright owns `127.0.0.1:4173`, refuses to
  reuse an existing server, and fails if its configured port is occupied. Both ports are configurable.
- Use Husky as the single Git-hook manager. The inactive duplicate Lefthook configuration was
  removed; the pre-commit hook runs `lint-staged` through pnpm.
- Permit install scripts only for the build binaries used by this repository: `@sentry/cli`,
  `esbuild`, `unrs-resolver`, and `workerd`.
- Use narrow, same-major pnpm overrides only where current direct tools still resolve known-vulnerable
  transitive patches (Rollup, minimatch/brace-expansion, flatted, and picomatch).

## Upgrade spans

| Area                | Before           | Baseline          | Compatibility proof                           |
| ------------------- | ---------------- | ----------------- | --------------------------------------------- |
| Node / pnpm         | floating 24 / 10 | 24.18.0 / 10.34.5 | frozen clean install + all gates              |
| Vite / React plugin | 6.4.1 / 5.1.4    | 8.2.1 / 6.0.5     | dev-owned E2E server + production build       |
| Vitest              | 2.1.9            | 4.1.10            | 454 unit and integration tests                |
| ESLint              | 8.57.1           | 9.39.5            | zero-error, zero-warning lint                 |
| jsdom               | 24.1.3           | 30.0.1            | DOM, auth, audio, MIDI, and integration tests |

## Validation

Run these from a clean worktree with the pinned toolchain:

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

Verified on 2026-08-10: frozen install, formatting, lint (zero warnings), typecheck, architecture,
454 unit/integration tests, 56 CI-mode E2E tests, production build, and audit passed.
The E2E server released `127.0.0.1:4173` after the run; an unrelated process already using port 3000
was not reused or modified.

The production bundle was 585.75 kB minified at this historical checkpoint, above Vite's 500 kB advisory
threshold. File line count is not a current CI gate; local function complexity and behavior-oriented
module boundaries carry that signal more directly.

## Remaining risk

- Real MIDI and microphone hardware remain outside this engineering baseline; existing mocks and
  E2E WebMIDI simulation are regression guards, not hardware certification.
- The React Hooks 7 package includes additional policy rules beyond the two established gates.
  Enabling those rules should be a separate reviewed code-health change.
- Test count is not a quality target. Review new tests for meaningful regression signal and remove
  implementation-coupled tests when they create more maintenance noise than protection.
- Product runtime libraries were intentionally not broadly upgraded without a product audit.
