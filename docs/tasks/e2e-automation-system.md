# Autonomous E2E System

Status: in progress

Branch: `codex/e2e-automation-system`

Base: `origin/develop` at `61e5457`

## Goal

Make routine SightPlay iteration self-verifying: an AI agent can run deterministic browser and system
journeys, receive structured failure evidence, reproduce failures locally, repair the implementation,
and rerun the same gates without routine human regression testing.

## Boundaries

- Scenario value and risk, not scenario counts or coverage percentages, determine admission.
- Controlled browser devices and provider stubs are regression evidence, not proof of physical MIDI,
  microphone acoustics, operating-system biometrics, or production-provider availability.
- Preview/provider checks must not expose production data or secrets to untrusted pull requests.
- This task does not deploy or merge `develop` to `main`.

## Batch 1 — Trustworthy and diagnosable Playwright

- [x] Make retry/trace configuration produce evidence without allowing flaky tests to pass.
- [x] Produce machine-readable failure records plus trace, screenshot, video, console, and network data.
- [x] Remove silent passes, misleading journeys, duplicated stale inventories, and fixed wall-clock waits.
- [x] Fail on unexpected page errors, request failures, and HTTP 5xx responses.

## Batch 2 — Shared hermetic harness

- [x] Add capability fixtures for authenticated pages, backend control, MIDI, audio, chat, and diagnostics.
- [x] Isolate backend state by E2E run ID and provide typed reset/seed controls only in E2E mode.
- [x] Make randomness, clocks, and external responses reproducible and attach the seed to failures.
- [x] Centralize common auth/session and browser-boundary setup.

## Batch 3 — Real system paths

- [x] Exercise the production frontend bundle through a local preview server.
- [x] Exercise real auth handlers, KV, cookies, and WebAuthn registration/login/logout ceremonies.
- [x] Exercise the real chat handler with only the Gemini upstream replaced by a controlled provider.
- [x] Exercise real WebMIDI adapter lifecycle and real Web Audio capture with a deterministic WAV source.
- [x] Cover critical Chromium and WebKit paths; retain named real hardware/provider gaps.

## Batch 4 — Autonomous CI loop

- [x] Split fast stable, local-system, cross-browser, provider-canary, and hardware evidence tiers.
- [x] Upload AI-readable failure artifacts with exact reproduction commands.
- [x] Add narrow critical/system and full-suite commands without allowing tests to weaken themselves silently.
- [x] Document the AI diagnose/fix/rerun protocol and trusted preview/provider security boundary.

## Verification and delivery

- [x] Frozen install, format, zero-warning lint, typecheck, architecture/dead-code/file-size gates.
- [x] Unit/integration tests, all Playwright projects, production build, and dependency audit.
- [x] Repeat the hermetic critical suite to audit flakiness and confirm ports/process cleanup.
- [ ] Commit, push, PR to `develop`, review CI, and merge without updating `main`.

## Progress log

- 2026-08-10: Created the delivery tracker from `origin/develop` after the AI-development baseline
  merged. The initial audit found 28 fixed sleeps, 13 specs intercepting APIs, unreachable retry traces,
  a silent MIDI pass, a mislabeled auth journey, and contradictory percentage-based E2E inventories.
- 2026-08-10: Implemented all four batches. The first complete local matrix passed 60/60 across stable
  Chromium, built-preview Chromium/WebKit system paths, and fake-capture audio; the standalone remote
  preview configuration also passed against the local built preview. Final repository gates and PR/CI
  evidence remain below.
- 2026-08-10: Final local gates passed: frozen install, format, zero-warning lint, typecheck,
  dependency/size/dead-code checks, 411 unit/integration tests, 60 Playwright tests, production build,
  and audit with no known vulnerabilities. Critical auth/chat/audio paths passed 15/15 across three
  consecutive runs. Ports 4173 and 4174 had no listener after completion. Non-blocking output: three
  files remain within 50 lines of the 300-line limit and the main bundle is 590.27 kB minified.
