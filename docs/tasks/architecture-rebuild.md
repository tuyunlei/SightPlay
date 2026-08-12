# Architecture Rebuild

Status: in progress

Current branch: `codex/architecture-boundaries`

Current base: `origin/develop` at `a1d9614` (PR #9)

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

- [ ] Make typed Route the only navigation fact.
- [ ] Represent booting, login, registration, and authenticated scenes as mutually exclusive states.
- [x] Move protected Practice, device, and Guidance runtime construction below authentication.
- [ ] Add structured identity failures and inject API, Passkey, navigation, telemetry, and clock ports.
- [ ] Prove cancellation recovery, route exclusivity, stale-result rejection, and runtime disposal.
- [ ] Delete AuthGate/UI-local workflow ownership and direct browser navigation.

Exit evidence: the complete App is assembled in a test; anonymous state creates no protected
capability; auth routes are mutually exclusive; no auth business branch depends on localized text.

## Phase 2 — Identity server and data

- [ ] Introduce shared runtime API contracts and stable error codes.
- [ ] Introduce Account, Credential, Invitation, Ceremony, and Session models.
- [ ] Implement transactional IdentityStore and D1 schema/migrations.
- [ ] Migrate existing production credentials without changing the RP ID.
- [ ] Replace fixed `owner`, global passkey arrays, generic KV writes, and stateless session ownership.
- [ ] Remove or protect the public error-report endpoint and enforce origin/CORS policy.

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
  proves anonymous sessions construct none of those runtimes; the real `useAuth` integration proves
  cancellation remains retryable and registration can return to login.
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
