# Architecture Rebuild

Status: in progress

Current branch: `codex/transactional-identity-server`

Current base: `origin/develop` at `cf18b34` (PR #12)

## Goal

Replace SightPlay's horizontal React orchestration with capability-owned functional cores, explicit
runtimes and ports, transactional identity, runtime-validated contracts, and a verification system
that makes important correctness claims executable.

## Progress semantics

A phase is complete only when its target owner is live, its legacy owner is deleted, its architecture
and behavior proofs pass, and operational gaps are named. File creation, test count, and code movement
alone are not progress. This document is updated in the same change as implementation evidence.

## Phase 0 — Architecture control plane

- [x] Define target system, invariants, capabilities, and repository shape.
- [x] Define module/runtime contracts and local-state admission rules.
- [x] Define identity, transactional data, WebAuthn, session, and telemetry policy.
- [x] Define the proof ladder and cross-system invariants.
- [x] Record the capability-module and transactional-identity decisions.
- [x] Establish workspace package boundaries and CI fitness rules.

Exit evidence: target documents reviewed as one coherent contract; new implementation has one approved
home and cannot add business ownership to legacy horizontal directories.

## Phase 1 — App Shell and Identity lifecycle

- [x] Make typed Route the only navigation fact.
- [x] Represent booting, login, registration, and authenticated scenes as mutually exclusive states.
- [x] Move protected Practice, device, and Guidance runtime construction below authentication.
- [x] Add structured identity failures and inject API, Passkey, and telemetry ports; keep navigation in
      App Shell's independently injected browser port.
- [x] Prove cancellation recovery, route exclusivity, stale-result rejection, and runtime disposal.
- [x] Delete workflow ownership from AuthGate and UI-local state, and delete direct browser navigation
      from Identity.

Exit evidence: the complete App is assembled in a test; anonymous state creates no protected
capability; auth routes are mutually exclusive; no auth business branch depends on localized text.

## Phase 2 — Identity server and data

- [x] Introduce shared runtime API contracts and stable error codes.
- [x] Introduce Account, Credential, Invitation, Ceremony, and Session models.
- [x] Implement transactional IdentityStore and D1 schema/migrations.
- [ ] Migrate existing production credentials without changing the RP ID.
- [x] Replace fixed `owner`, global passkey arrays, generic KV writes, and stateless session ownership.
- [x] Remove or protect the public error-report endpoint and enforce origin/CORS policy.

Exit evidence: concurrency/replay/rollback suites pass against the production repository adapter and a
preview custom domain completes registration, login, credential management, and logout.

## Phase 3 — Exercise, Instrument Input, and Practice

- [ ] Introduce `MidiPitch`, `ScoreFrame`, `ExercisePlan`, and deterministic generation.
- [ ] Compile song, random, and Coach content through the same Exercise contract.
- [ ] Normalize MIDI and microphone input into `InstrumentObservation`.
- [ ] Move held keys, attempts, timers, statistics, progress, and completion into one pure model.
- [ ] Add operation epochs and complete runtime disposal.
- [ ] Delete public practice setters, direct store reads, business refs, and duplicate song ownership.

Exit evidence: recorded seeds/action sequences reproduce sessions; property tests prove Practice
invariants; real WebMIDI/Web Audio system paths still pass.

## Phase 4 — Guidance and presentation

- [ ] Unify chat, hints, and recommendations under Guidance public contracts.
- [ ] Validate provider output before producing an `ExerciseProposal`.
- [ ] Make product fallback/retry decisions in the Guidance model rather than adapters.
- [ ] Adapt notation, piano, library, and settings UI to feature ViewModels and Intents.
- [ ] Remove cross-feature callbacks, mutable coordination refs, and implementation-shaped props.

Exit evidence: Guidance cannot write Practice directly; every provider failure maps through a tested
structured result; presentation modules contain no business transitions.

## Phase 5 — Platform convergence and legacy removal

- [ ] Use one server application for local, Cloudflare, and any retained platform adapters.
- [ ] Split explicit web and server builds; stop copying server TypeScript into the web artifact.
- [ ] Delete legacy business ownership from top-level `hooks/`, `services/`, `store/`, and `views/`.
- [ ] Remove low-value tests and production test escape hatches superseded by public contracts.
- [ ] Run the complete deterministic and named real-boundary evidence matrix.

Exit evidence: package graph and CI enforce the target architecture; no legacy dual owner remains;
production release remains a separate explicitly authorized operation.

## Decisions and open risks

- An invitation creates an independent account; adding a credential is authenticated account
  management. Revisit only through a superseding decision record.
- D1 is the first transactional adapter candidate. If an invariant cannot be proven under its concrete
  API, use a Durable Object serialization boundary rather than weakening the domain contract.
- Existing production credential migration and preview custom-domain configuration require live
  infrastructure discovery before Phase 2 execution.
- The rebuild remains a modular monolith. Package boundaries are correctness controls, not a plan to
  create independently deployed services.

## Progress log

- 2026-08-13: Started from `origin/develop@4477bc4`. Replaced the earlier local-complexity framing with
  a top-down target architecture covering product capabilities, runtime ownership, backend identity,
  transactional data, security, deployment, verification, and legacy exit conditions.
- 2026-08-13: Completed the Phase 0 architecture documents and began Phase 1 with App Shell routing and
  protected-runtime lifecycle as the first vertical cutover.
- 2026-08-13: Added the pure typed route parser/serializer, made login and registration exclusive
  Auth scenes, removed registration embedding and direct navigation from the auth screens, and moved
  Practice/AI/test runtime construction into the authenticated subtree. The full App assembly now
  proves anonymous sessions construct none of those runtimes; the assembled AuthGate integration
  proves cancellation remains retryable and registration can return to login.
- 2026-08-13: Verification checkpoint passed: format, zero-warning lint, typecheck, dependency/dead-code/
  file-size gates, 423 unit/integration tests, production build, and the 14-test auth E2E selection
  (13 passed, one documented WebKit virtual-WebAuthn skip). The build retains the existing 500 kB chunk
  advisory; three existing files remain near the 300-line size limit.
- 2026-08-13: PR #9 review identified that malformed percent-encoding in a song deep link could throw
  before the App ErrorBoundary mounted. The pure route parser now classifies malformed paths as unknown
  routes, with regression cases for incomplete and invalid UTF-8 encodings.
- 2026-08-13: PR #9 was squash-merged to `develop` at `a1d9614`. The next slice established the pnpm
  workspace and moved the App Shell route model behind `@sightplay/app-shell`'s public export. ESLint
  now rejects React, browser globals, timers, and implicit time/randomness inside package models;
  dependency-cruiser rejects deep imports and upward/runtime model dependencies, and a dedicated
  no-DOM/no-Node TypeScript project makes unlisted platform APIs fail closed.
- 2026-08-13: Captured the 25 remaining production files under top-level `hooks/`, `services/`,
  `store/`, and `views/` as a shrinking migration baseline. `lint:boundaries` rejects any new business
  source in those directories, so new capability ownership must enter the package architecture while
  each migration removes entries from the baseline.
- 2026-08-13: PR #10 was squash-merged to `develop` at `13532e7` after every required CI check passed.
  The next cutover made App Shell Route the sole page-selection fact: session plus Route now selects a
  mutually exclusive scene in a pure model; authorization redirects occur before protected runtime
  construction; passkey management, library difficulty, and song selection no longer use parallel
  React booleans/IDs. URL difficulty is decoded into a closed union, logout no longer writes browser
  history from Identity, and one exhaustive App interpreter preserves all recommendation payloads.
- Passkey management now retains its validated source content as an overlay. Application-opened
  overlays remove their own history entry on close, while direct deep links replace to a safe fallback;
  songs use the same dismissal contract so exit restores the prior filtered library. Active-route
  navigation is a no-op and song completion cannot leak across route lifecycles.
- 2026-08-13: Navigation checkpoint passed zero-warning lint, application and no-DOM/no-Node model
  typechecks, dependency/legacy/file-size/dead-code gates, 441 unit/integration tests, production
  build, and the complete Playwright matrix (61 passed, one documented WebKit virtual-WebAuthn skip).
  The first E2E pass exposed an ErrorBoundary test hook coupled to an auth query; moving fault
  injection under the real App boundary removed that hidden routing dependency before the clean rerun.
- 2026-08-13: PR #11 was squash-merged to `develop` at `6a0b400`. Identity now has one pure
  discriminated state/action/effect model in `@sightplay/identity-client`, one operation-epoch runtime,
  and injected API, Passkey, and telemetry ports. Browser HTTP/WebAuthn/Sentry implementations live in
  `@sightplay/browser-adapters`, where every HTTP payload is decoded before it enters Identity.
- 2026-08-13: App, AuthGate, login, registration, logout, and session refresh now use the new Identity
  owner. The legacy `useAuth`, provider/context, UI loading/error workflow state, and its shape-oriented
  hook tests were deleted in the same cutover. Pure and assembled tests prove cancellation produces a
  retryable action, stale results cannot authenticate, disposal aborts requests, lifecycle replay starts
  a fresh epoch, and anonymous App assembly does not construct protected runtimes.
- 2026-08-13: Identity deterministic checkpoint passed model/application typechecks, format,
  zero-warning lint, dependency/legacy/file-size/dead-code gates, and 459 unit/integration tests. Removed
  three E2E cases that asserted server-provided error copy; recovery remains covered at the lower React
  integration boundary while real WebAuthn/cookie/signature E2E remains intact.
- 2026-08-13: The first browser checkpoint correctly surfaced client-aborted session requests from
  React StrictMode lifecycle replay, but the shared diagnostic fixture classified every cancellation as
  a network failure while ignoring every console error. Diagnostics now recognize the browser's
  explicit abort code, fail unexpected console errors, and expected MIDI/microphone/AI recovery paths
  no longer log handled failures as errors. The 10 selected registration, login, logout, and account
  management browser paths pass with the stricter oracle.
- 2026-08-13: Phase 1 clean checkpoint passed both TypeScript projects, all architecture gates,
  zero-warning ESLint, 459 unit/integration tests, production build, and the complete Playwright matrix
  (58 passed, one documented WebKit virtual-WebAuthn skip). Browser-generated console errors are
  exempt only when their source URL matches an explicitly expected and actually observed HTTP failure;
  no test can silently suppress an unrelated console error. Request cancellation is exempt only for
  the known StrictMode `GET /api/auth/session` disposal path; all other aborted requests fail E2E.
  Expected ErrorBoundary faults use one-shot page/console budgets; recovery cannot suppress any later
  runtime error.
- 2026-08-13: A pre-push rerun timed out waiting for Google Fonts, exposing that production CSS was
  also generated at runtime by the Tailwind CDN. Tailwind now compiles through Vite, the system font
  stack replaces the remote font, and stale CDN/import-map tags are gone. The built HTML has no font,
  Tailwind, React, or icon CDN dependency; 20 responsive/theme/practice/smoke browser paths pass
  against the self-contained bundle.
- 2026-08-13: PR #12's final head `d3d3948` passed zero-warning lint, both typechecks, all architecture
  gates, 459 unit/integration tests, the complete Playwright matrix (58 passed, one documented
  WebKit virtual-WebAuthn skip), production build, and Cloudflare Preview. The latest-head review
  completed without new findings, and the PR was squash-merged to `develop` as `cf18b34`.
- 2026-08-13: Created `codex/transactional-identity-server` from the merged Phase 1 baseline and began
  Phase 2. The first cut establishes shared runtime-decoded HTTP contracts and pure Identity Server
  use cases before introducing D1; the cutover will not preserve mutable KV/session dual ownership.
- 2026-08-13: Added `@sightplay/api-contracts` and moved Identity HTTP decoding to the shared runtime
  codecs. Malformed nested credential descriptors now reject the whole provider response instead of
  being silently removed. Added `@sightplay/identity-server` with explicit records, strict origin
  policy, consumer-owned clock/entropy/WebAuthn/store ports, and independent registration,
  authentication, session, and credential use cases rather than an Auth manager.
- 2026-08-13: Implemented the D1 schema and domain-specific `IdentityStore`. SQLite constraints and
  precondition triggers turn failed invitation, ceremony, counter, and last-credential claims into
  transaction aborts; semantic failures are classified by authoritative rows rather than exception
  message matching. Five contract cases pass inside the real Cloudflare workerd/D1 runtime, proving
  concurrent one-invite registration, late-statement rollback, ceremony replay exclusion, concurrent
  counter monotonicity, and final-credential protection. The D1 suite is now part of `test:ci`.
- 2026-08-13: Cut credential and invitation management out of React into
  `@sightplay/account-access-client`. The pure transition owns asynchronous operation admission and
  final-key prevention, the disposable runtime invokes a runtime-decoded HTTP port, and application
  composition maps its `credentialSetChanged` output to Identity refresh. Removed the direct-fetch
  helper and implementation/static-heavy UI tests; 28 focused transition, disposal, adapter-contract,
  auth assembly, and account-management behavior proofs pass with all TypeScript projects.
- 2026-08-13: Removed the fixed-owner JWT/KV runtime, platform KV abstraction, legacy EdgeOne adapter,
  and unauthenticated raw error-report route. Every Identity HTTP route now decodes the shared contract,
  invokes a use case, and returns a stable envelope; authenticated mutations require an allowed Origin.
  Handler tests over real D1 prove anonymous session behavior, request rejection, credential management,
  last-credential protection, and Origin enforcement.
- 2026-08-13: Added a fail-closed decoder and idempotent D1 import for the legacy credential export. It
  maps the prior global credential set to one explicit migration account while preserving credential
  IDs, SPKI keys, algorithms, counters, and the production RP ID. The operator validator emits only a
  credential count, fixed account ID, and digest; live export/import and D1 binding remain operational
  evidence required before this Phase can close.
- 2026-08-13: The real Chromium virtual-authenticator journey initially exposed two boundary defects:
  the browser provider emitted padded base64url that the new verifier correctly rejected, and the E2E
  shim corrupted a shared attestation buffer while manipulating a counter. The browser port now
  validates and emits the canonical WebAuthn subset, the corrupting shim is gone, and the full real
  registration → session → logout → reload → login path passes through the actual handler, crypto,
  cookie, and D1-compatible store assembly (5 system cases pass; WebKit registration remains skipped
  because its runner lacks the virtual-authenticator boundary).
- 2026-08-13: Implemented the operational rate-limit policy that the target architecture previously
  only specified. Identity use cases now consume source, ceremony, invitation, and account limits
  through a dedicated port; the D1 adapter uses an atomic upsert and stores only digested subjects.
  Concurrent workerd evidence proves a limit of three admits exactly three of eight contenders and a
  new bucket opens only at the configured window boundary. The public invitation lookup no longer
  reaches the repository from its route; it is a rate-limited application use case.
- 2026-08-13: Phase 2's local delivery checkpoint passed formatting, zero-warning ESLint, three
  TypeScript projects, dependency/legacy/file-size/dead-code gates, 432 regular tests, 14 real D1
  tests, production build, and the complete Playwright matrix (58 passed, one documented WebKit
  virtual-WebAuthn skip). The stable auth fixture now obeys the same canonical credential-ID contract
  as the production WebAuthn adapter. Production credential import, the deployed `IDENTITY_DB`
  binding, and custom-domain lifecycle evidence remain intentionally unchecked operational gates.
