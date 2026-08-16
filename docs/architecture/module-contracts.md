# Module and Runtime Contracts

Status: target

## Feature protocol

A stateful feature owns a closed state transition and exposes semantic intent, observable projection,
typed output, and lifecycle. The following shape describes the contract; it is not a required generic
base class:

```ts
interface FeatureModule<View, Intent, Output> {
  getView(): View;
  dispatch(intent: Intent): void;
  subscribe(listener: () => void): () => void;
  onOutput(listener: (output: Output) => void): () => void;
  dispose(): void;
}
```

Individual features retain domain-specific state, action, command, and output unions. A runtime
serializes dispatch, interprets effects, and sends asynchronous results back as actions carrying an
`operationId`. `dispose()` invalidates the current operation epoch before cancelling adapters, so late
results are harmless even when the underlying platform cannot abort them.

## App Shell

Navigation is the sole page-selection fact:

```ts
type ContentRoute =
  | { kind: 'randomPractice' }
  | { kind: 'library'; difficulty?: Difficulty }
  | { kind: 'songPractice'; songId: SongId };

type Route =
  | { kind: 'login' }
  | { kind: 'register'; inviteCode?: InviteCode }
  | ContentRoute
  | { kind: 'passkeys'; returnTo?: ContentRoute };
```

Parsing, serialization, and authorization redirects are pure. Browser history implements a
`NavigationPort`; components request navigation through semantic intents. No component may mirror a
route in booleans or nullable identifiers. Dismissible routes are pushed with an adapter-owned history
marker. Exiting an application-opened song or modal removes that entry and restores the exact prior
route; exiting a direct deep link replaces it with a validated safe fallback. Modal routes carry a
validated content return route and render that content underneath.

## Identity client

Identity is a closed session and ceremony lifecycle. `@sightplay/identity-client` owns the pure
`IdentityState`, semantic intents, result actions, typed effects, selectors, and operation epochs. Its
runtime is the only effect interpreter: it invokes consumer-owned API, Passkey, and telemetry ports,
feeds structured results back into the transition, aborts active HTTP requests on disposal, and
ignores all results from an older lifecycle generation.

`@sightplay/browser-adapters` owns HTTP decoding, WebAuthn invocation and error classification, and
Sentry projection. Localized messages belong to the React projection; adapter response text and
exception messages never select a business branch. App Shell remains the sole navigation owner, so
Identity success changes the public session state and the scene selector performs any resulting route
authorization without Identity writing browser history.

Authenticated credential and invitation management is the independent Account Access capability.
Its pure transition owns loading, invitation creation, and credential revocation; its runtime emits a
`credentialSetChanged` output after an accepted revocation. Application composition maps that output
to Identity session refresh. React does not call the Account Access HTTP adapter or sequence reloads.

## Identity server

`@sightplay/api-contracts` is the only wire-schema owner. Both HTTP sides runtime-decode unknown JSON;
one malformed nested item rejects the complete contract rather than being filtered into a different
meaning. `@sightplay/identity-server` owns records and use cases, while HTTP, WebAuthn, entropy, clock,
and D1 remain ports or adapters. Registration, authentication, session, and credential operations are
independent functions over one dependency record; there is no general-purpose manager or service
locator.

The D1 adapter exposes domain commands, not SQL or key/value primitives. Claim rows have database
triggers that validate ceremony, invitation, active credential, monotonic counter, and final-key
preconditions inside the same transaction that mutates records. A failed D1 batch is classified by
reading structured authoritative state after rollback; adapter behavior never branches on SQLite
exception wording.

## Exercise and Practice

Song, random, and coach content compile into one plan:

```ts
type ExercisePlan =
  | { kind: 'finite'; source: 'song' | 'coach'; frames: readonly ScoreFrame[]; metadata: Metadata }
  | { kind: 'generated'; source: 'random'; config: RandomConfig; seed: RandomSeed };

type ScoreFrame = {
  id: ScoreFrameId;
  pitches: NonEmptyReadonlyArray<MidiPitch>;
  duration?: Duration;
  notation?: NoteSpelling;
};
```

MIDI and microphone adapters normalize browser events into `InstrumentObservation`. The Practice model
owns held pitches, attempt timing, match stability, score, streak, cursor, and completion. Timer tokens
and session epochs are state, not refs. Random seeds and deterministic frame identifiers allow a
production session to be replayed.

## Guidance

`@sightplay/guidance` owns conversation admission, provider request epochs, semantic messages, hint
trigger/rate/timer policy, recommendation/dismissal policy, completion feedback, and structured
recovery. It consumes application-mapped `attemptAccepted` and `exerciseCompleted` observations and may
emit a validated `ExerciseProposal` or an exact recommendation action; it cannot import or mutate
Practice.

`@sightplay/api-contracts` decodes the complete chat request, stable envelope, reply, and nested proposal
before either HTTP side treats it as valid. `@sightplay/browser-adapters` maps transport and stable error
codes to Guidance's provider-independent `GuidanceChatResult`; it never selects copy or manufactures a
successful fallback. Application composition is the sole mapping from Guidance output to Practice/App
Shell intent, and that mapping is exhaustive. Chat input and drawer visibility remain local presentation
state because they are discardable and own no async operation.

## Local UI state

State remains in React only when it has one component owner, has no effect on URL, domain decisions,
network/device work, or another feature, and can be discarded safely on unmount. Examples include
drawer visibility, layout measurements, unsubmitted form input, hover state, and short-lived copy
feedback.

## Mechanical dependency rules

- Feature models cannot import React, Zustand, DOM types, adapters, network clients, system clocks,
  random generators, UUID generators, or timers.
- A capability cannot import another capability, including its public API. Application composition is
  the only place that maps one capability's public output to another capability's public intent.
- UI and application modules cannot import browser adapters or mutable stores and cannot expose raw
  field setters. `App.tsx` is the sole browser composition root that constructs adapters and injects
  them into authenticated or public capability boundaries.
- Adapters implement consumer-owned ports; ports never depend on adapters.
- Applications import package exports only; deep imports fail CI.
- Hosting and local-development adapters call the same server application route table. Cloudflare exposes
  one `/api/*` catch-all; hosting files cannot enumerate product paths/methods or contain handlers.
- `window`, `navigator`, `fetch`, `Date.now`, `Math.random`, `crypto.randomUUID`, and `setTimeout` are
  restricted to adapters or composition infrastructure.
- Every effectful runtime has an executable disposal/cancellation contract.

Every workspace package declares a structured `sightplayArchitecture` contract in its manifest. `role`
is `application`, `capability`, `contracts`, `domain`, or `adapters`. An application may map public
capability contracts but cannot become a capability's state owner. A capability also declares whether
its lifecycle is `none`, `request-scoped`, or `managed-runtime`; a managed runtime names its
implementation entry and behavior test. This metadata is the source for the fitness gate, so enforcement
does not depend on class names, directory guesses, or a manually maintained package list.

External JSON enters adapter and HTTP-handler code only through `readUnknownJson()` or
`parseUnknownJson()`. These admission functions return `unknown`; direct `.json()` and `JSON.parse()` are
forbidden in adapter/application ingress, and admitted values cannot be returned raw or asserted into a
trusted type. TypeScript preserves the untrusted type until code narrows it, while codec and adapter
contract tests—not AST shape—prove that the complete external contract is accepted or rejected.

The rules are executable in four layers. Workspace package `exports` define the supported import
surface; dependency-cruiser prevents deep imports, legacy upward dependencies, and cycles; the AST
fitness gate enforces package roles, capability-to-adapter isolation, composition-root ownership,
unknown-input admission, declared runtime lifecycle shape, disposable resource ports,
cancellable schedulers, and hosting-only route wrappers; the lifecycle scan proves contract shape and
the declared runtime suites prove teardown behavior. ESLint prevents pure models from accessing
framework or ambient runtime capabilities. A separate no-DOM/no-Node TypeScript project
compiles production models, while the dependency graph rejects all external and core runtime modules
from that layer. Web and server builds are explicit independent artifacts; server TypeScript is never
copied into the browser output. During migration, `architecture/legacy-business-files.txt` is a one-way
baseline: files may be removed from it, but CI rejects new production files in the legacy horizontal
directories.
