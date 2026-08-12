# Target Architecture

Status: target

SightPlay is being rebuilt as a modular monolith whose correctness comes from explicit ownership,
pure decisions, runtime-validated boundaries, and mechanically enforced dependencies. The target is
not constrained by the current `hooks/`, `services/`, `store/`, or `views/` layout; migration is staged
only to keep each cutover reviewable and verifiable.

## System model

```text
Identity session ──controls──> Protected Runtime

Song / random / coach proposal ──compile──> ExercisePlan
MIDI / microphone ──normalize──> InstrumentObservation

ExercisePlan + InstrumentObservation
            │
            ▼
      Practice transition ──> State + Effects + PracticeEvents
                                      │
                   ┌──────────────────┼──────────────────┐
                   ▼                  ▼                  ▼
             UI projection       Guidance          Telemetry
                                      │
                              validated proposal
                                      │
                                      └────> ExercisePlan
```

## System invariants

1. A business fact has one owner and one semantic write boundary.
2. Unauthenticated state means protected runtimes and device/provider subscriptions do not exist.
3. Login and registration are mutually exclusive scenes; cancellation and failure are typed events.
4. At most one exercise is active. Target, progress, and completion derive from its plan and cursor.
5. One input observation is accepted at most once; feedback, statistics, and progress change atomically.
6. External input is decoded and normalized before entering a feature model.
7. Effects carry an operation identity and cannot update a disposed or superseded runtime.
8. Product decisions do not depend on React, Zustand, browser APIs, platform storage, or provider DTOs.

## Capabilities and ownership

| Capability       | Owns                                                                      | Does not own                          |
| ---------------- | ------------------------------------------------------------------------- | ------------------------------------- |
| App Shell        | bootstrap, typed route, public/private scene, protected-runtime lifecycle | feature decisions                     |
| Identity         | session, login/register ceremonies, logout, credentials                   | invite issuance and storage mechanics |
| Invitations      | purpose, expiry, consumption, rate policy                                 | WebAuthn verification                 |
| Exercise         | catalog definitions and compilation into `ExercisePlan`                   | practice progress                     |
| Instrument Input | MIDI/audio lifecycle and normalized observations                          | correct-note decisions                |
| Practice         | evaluation, attempts, held keys, statistics, progress, completion         | rendering or coaching policy          |
| Guidance         | conversation, hints, recommendations, exercise proposals                  | direct practice mutation              |
| Presentation     | notation, piano, design system, localized projections                     | business transitions                  |
| Preferences      | language and small durable user choices                                   | workflow state                        |

## Runtime topology

Identity and Navigation are created at application bootstrap. A pure scene selector combines their
public state into `booting`, `anonymous`, or `authenticated`. Only the authenticated scene constructs a
`ProtectedRuntime` containing Practice, Instrument Input, Catalog, and Guidance; logout or invalidation
disposes it and cancels all requests, timers, and device subscriptions.

Each stateful capability contains:

- `model`: discriminated state/action/effect unions, transition, selectors, invariants;
- `ports`: narrow external capabilities defined by the consumer;
- `runtime`: effect interpretation, operation identity, cancellation, subscription, disposal;
- `react`: ViewModel subscription and Intent dispatch;
- `public.ts`: the only cross-package import surface.

Cross-capability mappings are explicit in the application composition root. A mapping with its own
multi-step state becomes a named workflow model; it never becomes a generic Manager, Coordinator,
service locator, or broadcast event bus.

## Target repository shape

```text
apps/
  web/                    # browser bootstrap and application composition
  edge/                   # platform bootstrap and server composition
packages/
  api-contracts/          # DTO codecs and stable error contracts
  music-domain/           # value types and pure music algorithms
  app-shell/
  identity-client/
  identity-server/
  invitations/
  exercise/
  instrument-input/
  practice/
  guidance/
  presentation/
  browser-adapters/
  server-application/
  testkit/
functions/                # hosting-required thin wrappers only
```

These are private workspace packages with explicit exports, not independently deployed services.
Package boundaries make capability ownership executable and keep the web and edge applications as the
only composition roots.

## Related documents

- [Module and runtime contracts](module-contracts.md)
- [Identity, data, and security](identity-data-security.md)
- [Verification architecture](verification.md)
- [Architecture rebuild tracker](../tasks/architecture-rebuild.md)
- [Decision 0002](../decisions/0002-capability-modules-and-functional-core.md)
- [Decision 0003](../decisions/0003-transactional-identity-model.md)
