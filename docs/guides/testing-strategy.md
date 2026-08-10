# Testing Strategy

SightPlay optimizes tests for regression signal, not line count. CI intentionally does not collect or
gate coverage.

## Test layers

| Layer                     | Proves                                                                                     | Does not prove                                       |
| ------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| Pure domain/decision test | State transitions, branches, invariants, error decisions                                   | React wiring or browser APIs                         |
| Adapter contract test     | SightPlay's behavior against MIDI, audio, network, storage, clock, or scheduler interfaces | The assembled product path                           |
| React integration test    | Components/hooks/stores collaborate through public behavior                                | Real hardware or production services                 |
| Playwright stable path    | Browser assembly and important user journeys with controlled dependencies                  | Real hardware or production availability             |
| Playwright local system   | Built bundle, handlers, storage, cookies, crypto ceremonies, and browser adapters          | Physical device UX or external-provider availability |
| Opt-in real check         | A named preview, hardware, or provider boundary                                            | Deterministic CI regression coverage                 |

Use the lowest layer that directly observes the behavior, and add a higher-layer test only for wiring or
runtime risks that the lower layer cannot prove.

## Value review

Before adding or keeping a test, identify the production regression it detects. Prefer tests that fail
when a business branch, public contract, or user path is broken. Remove tests whose only signal is an
intentional refactor of wording or implementation shape.

Do not test:

- system prompt or static copy containment;
- names in simple registries or object-key inventories;
- the presence/type of returned setters and callbacks;
- one module forwarding directly to another when no decision is made;
- a fake or helper's own canned behavior;
- success paths that mock every production collaborator and assert only that the mocks ran.

When a mock replaces a meaningful boundary, keep a separate contract test for the real adapter. Avoid
wall-clock sleeps: inject a clock/scheduler or wait for an observable condition with a bounded failure
timeout.

## Change expectations

- Domain decision changes include branch-focused pure tests.
- Adapter changes include success, failure, and lifecycle contract tests relevant to that adapter.
- User-visible path changes update the corresponding Playwright scenario or explain why another layer is
  sufficient.
- A deleted low-value test needs no replacement unless it was the only proof of a real behavior.
- Test count and coverage percentage are diagnostics, never targets or acceptance criteria.

The E2E risk/evidence matrix lives in [`../../e2e/TEST_PLAN.md`](../../e2e/TEST_PLAN.md); operational
tiers and artifact-driven agent workflow live in [`autonomous-e2e.md`](autonomous-e2e.md).
