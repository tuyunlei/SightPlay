# Architecture Rebuild

Status: in progress

Current follow-up branch: `codex/ci-signal-hardening`

Current base: `origin/develop` at `477a5c1`. PR #16 squash-merged the complete formerly stacked Identity,
Practice, Guidance, and architecture-fitness rebuild; PRs #13–#15 are superseded delivery slices. CI
signal hardening is tracked separately in `docs/tasks/ci-signal-hardening.md`.

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
generated Pages Preview completes registration, login, credential management, and logout.

## Phase 3 — Exercise, Instrument Input, and Practice

- [x] Introduce `MidiPitch`, `ScoreFrame`, `ExercisePlan`, and deterministic generation.
- [x] Compile song, random, and Coach content through the same Exercise contract.
- [x] Normalize MIDI and microphone input into `InstrumentObservation`.
- [x] Move held keys, attempts, timers, statistics, progress, and completion into one pure model.
- [x] Add operation epochs and complete runtime disposal.
- [x] Delete public practice setters, direct store reads, business refs, and duplicate song ownership.

Exit evidence: recorded seeds/action sequences reproduce sessions; property tests prove Practice
invariants; real WebMIDI/Web Audio system paths still pass.

## Phase 4 — Guidance and presentation

- [x] Unify chat, hints, and recommendations under Guidance public contracts.
- [x] Validate provider output before producing an `ExerciseProposal`.
- [x] Make product fallback/retry decisions in the Guidance model rather than adapters.
- [x] Adapt notation, piano, library, and settings UI to feature ViewModels and Intents.
- [x] Remove cross-feature callbacks, mutable coordination refs, and implementation-shaped props.

Exit evidence: Guidance cannot write Practice directly; every provider failure maps through a tested
structured result; presentation modules contain no business transitions.

## Phase 5 — Platform convergence and legacy removal

- [x] Enforce package ownership, unknown-input admission, and managed-runtime lifecycle in CI.
- [x] Use one server application for local, Cloudflare, and any retained platform adapters.
- [x] Split explicit web and server builds; stop copying server TypeScript into the web artifact.
- [x] Delete legacy business ownership from top-level `hooks/`, `services/`, `store/`, and `views/`.
- [x] Remove low-value tests and production test escape hatches superseded by public contracts.
- [x] Run the complete deterministic and named real-boundary evidence matrix.

Exit evidence: package graph and CI enforce the target architecture; no legacy dual owner remains;
production release remains a separate explicitly authorized operation.

## Current completion audit

| Completion condition                                                                    | Status                                              | Authoritative evidence                                                                                                                                                                                                                                                                             |
| --------------------------------------------------------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Legacy horizontal directories do not own workflows and no v1/v2 state is double-written | Proven in source                                    | Empty `architecture/legacy-business-files.txt`; `lint:boundaries`; no production files under `hooks/`, `services/`, `store/`, or `views/`; capability public contracts and one application composition root                                                                                        |
| Anonymous state cannot start protected runtime                                          | Proven deterministically                            | `App.integration.test.tsx` constructs no Practice/MIDI/Guidance ports while anonymous, constructs them only after authentication, and proves logout disposes MIDI and microphone once; `AuthGate.integration.test.tsx` rejects protected children before authorization                             |
| Random, song, and AI exercises share Practice                                           | Proven deterministically and at browser boundary    | All three compile to `ExercisePlan`; Guidance-to-Practice assembly proof; random/song WebMIDI and real Web Audio paths drive the same Practice runtime                                                                                                                                             |
| Identity invariants are transactional                                                   | Proven in workerd/D1; cloud lifecycle still pending | 19 D1 tests include one-time bootstrap, concurrent invite use, rollback, replay exclusion, monotonic counters, final-credential protection, rate limits, and import idempotency; production migration remains Phase 2's operational gate                                                           |
| CI rejects structural violations and behavior suites prove runtime contracts            | Proven locally; follow-up CI run pending            | Package roles/exports, capability-to-adapter and composition-root rules, dependency-cruiser, no-DOM model compile, unknown-JSON admission/non-escape, declared runtime behavior suites, cancellable resource ports, single Cloudflare catch-all, legacy baseline, and dead-code analysis run in CI |

## Decisions and open risks

- An invitation creates an independent account; adding a credential is authenticated account
  management. Revisit only through a superseding decision record.
- D1 is the first transactional adapter candidate. If an invariant cannot be proven under its concrete
  API, use a Durable Object serialization boundary rather than weakening the domain contract.
- Phase 2 uses distinct production and preview D1 bindings on the existing `sightplay` Pages project.
  Production keeps `sightplay.xclz.org`; pull-request Preview uses Pages-generated hostnames and the
  separate `sightplay.pages.dev` RP ID under Decision 0004.
- The rebuild remains a modular monolith. Package boundaries are correctness controls, not a plan to
  create independently deployed services.

## Progress log

- 2026-08-14: Started the post-merge CI signal hardening slice from `origin/develop` `477a5c1`. The
  change removes the file-length and default-export policy gates, deletes dead legacy dependency rules,
  replaces six repeated workflow setups with three parallel proof jobs, removes full Playwright from
  pre-push, prevents CI builds from uploading Sentry sourcemaps, clears Knip configuration hints, and
  narrows lifecycle/ingress fitness claims to structure they can actually prove. The dedicated task
  tracker records verification and the remaining branch-protection operation.

- 2026-08-14: Retargeted PR #16 from its Guidance parent directly to `develop`, then closed and reopened
  it so GitHub evaluated the real complete merge diff. CI run `31783961426` passed arch, lint, typecheck,
  276 regular tests, 19 workerd/D1 tests, the complete browser matrix, and independent web/server build;
  Cloudflare Pages also passed at head `814d6ba`. The generated Preview `0d2c6f9e.sightplay.pages.dev`
  returned an anonymous session, accepted its own SightPlay Pages origin through the Identity handler,
  wrote the probe rate limit to PPE D1, and rejected a foreign Pages origin. The single probe row was
  deleted and PPE accounts, credentials, invitations, ceremonies, sessions, bootstrap claims, and rate
  limits were reverified empty. Full remote registration/login remains intentionally separate because it
  requires temporarily bootstrapping an account rather than merely proving Preview topology.

- 2026-08-14: Re-audited the rebuild against its completion contract instead of treating green leaf PRs
  as delivery. Strengthened the architecture fitness gate so capability packages cannot import adapters,
  UI/application modules cannot construct browser adapters outside `App.tsx`, raw `unknown` JSON cannot
  escape ingress before validation, and a managed runtime cannot satisfy lifecycle policy with an empty
  `dispose()`. Negative fixtures prove every rejection. The assembled App test now also proves a completed
  logout unmounts the authenticated subtree and disposes MIDI and microphone exactly once.

- 2026-08-14: A Codex session-log and live Cloudflare inventory audit found that the fixed
  `develop.sightplay.xclz.org` PPE topology was an unnecessary detour: it duplicated Pages-native Preview,
  coupled a stable hostname to PR #16, and incorrectly reused the production RP ID. Decision 0004 and the
  runbooks now use generated `*.sightplay.pages.dev` origins with RP ID `sightplay.pages.dev` and the shared
  disposable PPE D1, while production remains `sightplay.xclz.org` with Production D1. Removed the custom
  domain, CNAME, preview bootstrap secret, local Keychain material, generated invitation, bootstrap claim,
  rate-limit row, and two known secret-bearing deployments; both D1 databases and the Git-owned deployment
  flow remain. Preview `2bb2edaa` proved an anonymous session from PPE D1, accepted its generated SightPlay
  origin, rejected a foreign Pages project, and rejected bootstrap without the removed secret.
  The first replacement exposed that authentication options omitted the parent RP ID even though registration
  supplied it; the API contract and browser adapter now carry `sightplay.pages.dev` through login explicitly.

- 2026-08-13: Replaced the permanent broad-secret invitation administrator route with an explicit
  empty-store bootstrap capability. `IDENTITY_BOOTSTRAP_SECRET` is configuration-gated; a singleton D1
  claim and the first invitation batch commit together, so exactly one concurrent bootstrap request can
  succeed and any existing account or invitation closes the path. Pure use-case, assembled HTTP/D1, and
  concurrent workerd tests prove the capability while the PPE runbook requires secret removal after first
  account creation.

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
- 2026-08-13: Latest-head review found that an invalid percent escape in the session cookie reached
  `decodeURIComponent` and became an internal error. Cookie decoding now fails closed to anonymous
  state before hashing or repository access; the assembled handler over real D1 proves malformed
  external input returns a valid anonymous session snapshot rather than a 500.
- 2026-08-13: Phase 3 replaced every Practice workflow owner in one vertical cutover. Random generation,
  songs, and Coach challenges now compile into the same runtime-decoded `ExercisePlan`; MIDI and Web
  Audio normalize into one timestamped observation union; one pure transition owns held pitches,
  attempts, score, timing, progress, completion, and stale-effect rejection. Browser ports own and
  dispose MIDI handlers, microphone tracks, AudioContext nodes, animation frames, and scheduled effects.
- 2026-08-13: App constructs Practice only below authenticated Identity and mounts route/Guidance
  consumers only after the runtime starts. The old Practice Zustand store, public field setters, direct
  singleton reads, mutable handler refs, queue/reducer split, MIDI/Audio services and hooks, song mount
  setter sequence, and React-owned song completion were deleted in the same cutover; no production
  reference to a former owner remains.
- 2026-08-13: The first full browser run exposed overlapping both-hand pitch ranges and an audio proof
  still coupled to obsolete `Math.random`. The generator now guarantees disjoint decoded hand ranges and
  unique chord pitches across seeds; a deterministic legal-range waveform drives the actual capture,
  AudioContext, pitch detector, and Practice transition without a production seed override. Mixed action
  sequences additionally found and fixed valid zero seed/MIDI truthiness rejection and a pre-start route
  intent race.
- 2026-08-13: Phase 3's clean delivery checkpoint passes formatting, zero-warning ESLint, all TypeScript
  projects, dependency/legacy/file-size/dead-code gates, 293 regular tests, 15 real D1 tests, production
  build, and the complete Playwright matrix (58 passed, one documented WebKit virtual-WebAuthn skip).
  Pure evidence includes 16,384 deterministic mixed transitions plus 1,920 cross-seed generated frames;
  real WebMIDI and fake-capture Web Audio system paths remain green. Phase 4 Guidance is next; Phase 2's
  production migration and deployed D1/custom-domain proof remains a separate operational gate.
- 2026-08-13: Phase 4 gives chat, contextual hints, recommendations, and Coach-completion feedback one
  pure Guidance owner. Practice emits authoritative accepted/completed events; Guidance consumes their
  application-mapped observations and emits only validated exercise proposals or exact recommendation
  actions. One exhaustive App mapping reaches Practice/App Shell public intents, and an assembled test
  runs the real Guidance and Practice runtimes to prove a provider proposal becomes the same finite
  Practice plan used by other sources.
- 2026-08-13: Both chat HTTP sides now runtime-decode the stable Guidance envelope and every nested
  proposal field. Transport adapters return structured failures without product fallback; Guidance owns
  connection recovery, local hint fallback, timer/rate policy, stale result rejection, and cancellation.
  Stable browser mocks use the shared envelope and the real-provider canary validates the enveloped
  result rather than accepting the removed legacy shape.
- 2026-08-13: Deleted `useAiCoach`, `useContextualHints`, `useRecommendations`, `geminiService`, the
  legacy recommendation domain/interpreter, and their shape-oriented tests in the same cutover. React
  retains only disposable presentation state such as drawer visibility, input draft, refs, and copy
  feedback; song retry is now one semantic Practice intent rather than UI plan reconstruction. The full
  browser and delivery checkpoints remain pending before this branch is committed and Phase 4 is called
  delivered.
- 2026-08-13: Phase 5 adds manifest-declared package roles and lifecycle kinds plus an AST fitness gate.
  CI now rejects capability-to-capability imports, direct/asserted JSON at adapter and HTTP ingress,
  managed runtimes without declared disposal evidence, resource ports without teardown, and schedulers
  without cancellation handles. Isolated negative fixtures prove each rejection path; the regular 267
  tests and all TypeScript projects pass with unknown-JSON admission applied to both browser and server
  adapters. Legacy removal and platform convergence remain active.
- 2026-08-13: The complete browser matrix caught and corrected one policy leak before delivery: song
  streaks requested contextual hints even though that projection exists only in random practice. Hint
  admission is now source-typed in the pure model; songs retain completion recommendations and Coach
  exercises retain explicit completion feedback. The final Phase 4 checkpoint passes formatting,
  zero-warning ESLint, all TypeScript projects, dependency/legacy/file-size/dead-code gates, 266 regular
  tests, 15 real D1 tests, production build, and complete Playwright (58 passed, one documented WebKit
  virtual-WebAuthn skip). Phase 4 is delivered; Phase 5 architecture/CI convergence is next while the
  separately authorized production Identity migration and deployed D1/custom-domain proof remain open.
- 2026-08-13: Phase 5 removed the final legacy ownership baseline and production Practice test API.
  Presentation moved under the application boundary; language became a pure Preferences capability;
  public Practice simulation intents and bypass-heavy UI E2E were deleted. WebMIDI/song proofs now drive
  a test-owned browser device through the production adapter and use public exercise/catalog contracts.
- 2026-08-13: Local Vite and Cloudflare Pages now invoke one `@sightplay/server-application` route table.
  One hosting catch-all replaces every path/method wrapper, is mechanically restricted to the shared
  handler export, and handler-local method policy was deleted. A real local Pages runtime returns the
  application-owned 204/404/405 contracts through that catch-all. `build:web` emits only browser assets
  while `build:server` independently compiles the Worker; server TypeScript is no longer copied into
  `dist`.
- 2026-08-13: Phase 5 final source checkpoint passes format, zero-warning ESLint, three TypeScript
  projects, all architecture gates, 269 regular tests, 15 real workerd/D1 tests, independent web/server
  builds, and the complete Playwright matrix (51 passed, one documented WebKit virtual-WebAuthn skip).
  A local Pages runtime additionally proved the single catch-all returns application-owned 204/404/405
  contracts. Phase 5 is complete; Phase 2 remains open only for the explicitly authorized deployed D1,
  migration, generated-Preview, and real Passkey lifecycle evidence.
- 2026-08-13: Authorized Cloudflare OAuth inventory found no existing D1 databases. Created empty APAC
  databases `sightplay-identity-production` and `sightplay-identity-ppe`; neither was bound at creation. The
  first remote migration exposed Cloudflare's `CASE`/trigger SQL-splitter defect that local SQLite and local
  D1 do not reproduce. Parenthesizing each trigger `CASE` preserves its behavior and allowed all three
  migrations to apply to both remote databases. Deployed Preview binding and real Passkey proof remain in
  progress; production data import and release remain separately gated.
