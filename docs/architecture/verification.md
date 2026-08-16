# Verification Architecture

Status: target

Verification proves invariants and real boundaries; it does not reward test count, line coverage, or
implementation-shape assertions.

## Proof ladder

1. **Transition and property tests** prove exhaustive branches and action-sequence invariants in pure
   feature models.
2. **Adapter contract suites** run the same behavioral contract against fakes and production adapters
   where practical.
3. **Assembled feature tests** use real feature models and runtimes with controlled ports to prove
   intent, effect, cancellation, and UI projection wiring.
4. **Application composition tests** create the real App Shell with instrumented capabilities and
   prove route exclusivity and protected-runtime lifecycle.
5. **Server application tests** use the real transactional repository adapter to prove concurrency,
   replay prevention, ownership, and rollback.
6. **System E2E** proves browser, handler, storage, cookie, crypto, WebMIDI, and Web Audio boundaries
   that lower layers intentionally replace.
7. **Opt-in runtime evidence** proves named preview domains, real Passkeys, hardware, and providers;
   this evidence never substitutes for deterministic regression tests.

## Required invariants

### App and Identity

- Login and registration cannot render simultaneously.
- Cancellation returns to an executable login state without changing route or creating registration.
- Anonymous scenes never create Practice, MIDI, microphone, or Guidance runtimes.
- Logout and session invalidation dispose the protected runtime exactly once.
- A result from a disposed login/register operation cannot authenticate or change the visible scene.

### Practice

- Cursor stays within the active plan and completion occurs at most once.
- An observation is accepted at most once for an attempt.
- Statistics and progress are monotonic where the product contract requires it.
- Stale timer tokens and prior-session epochs are ignored.
- Disposal cancels input subscriptions and scheduled effects.
- A stored seed and action sequence reproduce the same generated exercise and result.

### Guidance

- Malformed requests, envelopes, replies, and nested proposals are rejected before entering Guidance.
- One conversation request is admitted at a time; stale and post-disposal results cannot change state or
  emit an exercise.
- Accepted Practice events deterministically trigger hint and recommendation decisions; timer tokens and
  rate limits are model state rather than React refs.
- Provider failure selects structured recovery in Guidance, while localized presentation only projects
  the chosen semantic message.
- A validated proposal reaches Practice through the exhaustive application mapping and starts the same
  Practice core used by songs and random exercises.

### Identity server

- Concurrent use of one invitation produces exactly one successful registration.
- A ceremony cannot be replayed, including after partial failure.
- Credential identifiers are globally unique and counters never decrease.
- An account cannot lose its last active credential.
- Failed atomic commands leave no account, credential, invitation, ceremony, or session half-updated.

## CI architecture gates

- Package exports, declared package roles, and dependency rules enforce capability isolation and model
  purity; stateful capabilities cannot coordinate each other by importing public APIs.
- Network/provider JSON enters through helpers that return `unknown`. The static gate blocks direct JSON
  parsing, returning raw admitted values, and asserting admitted values into trusted types; adapter and
  codec behavior tests prove whether a concrete contract is actually accepted or rejected.
- Exhaustive union handling fails typecheck when a state or effect is added without interpretation.
- Every capability declares its lifecycle. A managed runtime names an implementation and lifecycle test;
  the static gate verifies the `start()`/`dispose()` shape, while that runtime's behavior test proves
  cancellation and late-result rejection. Resource-starting ports require disposal and schedulers require
  cancellation handles.
- Unexpected browser console errors and unhandled requests fail assembled and E2E tests.
- Production-only test APIs and direct cross-feature store access are forbidden.

`lint:fitness` executes the repository scan and isolated negative fixtures. The negative fixtures must
demonstrate that CI rejects capability coupling, capability-owned adapters, browser-adapter construction
outside `App.tsx`, missing lifecycle declarations or methods, asserted or escaping admitted JSON, a
resource-starting port without disposal, and a scheduler without cancellation; multiple Cloudflare route
files or a catch-all containing application logic also fail. The positive fixture proves the corresponding
compliant slice and both supported hosting-only catch-all forms are admitted. These fixtures test static
structure only and never stand in for feature behavior tests.

When a defect escapes, repair the nearest false or missing proof first. Add higher-layer coverage only
when the escaped behavior depends on assembly or a real boundary that the lower layer cannot observe.
