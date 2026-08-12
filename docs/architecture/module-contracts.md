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
type Route =
  | { kind: 'login' }
  | { kind: 'register'; inviteCode?: InviteCode }
  | { kind: 'randomPractice' }
  | { kind: 'library'; difficulty?: Difficulty }
  | { kind: 'songPractice'; songId: SongId }
  | { kind: 'passkeys' };
```

Parsing, serialization, and authorization redirects are pure. Browser history implements a
`NavigationPort`; components request navigation through semantic intents. No component may mirror a
route in booleans or nullable identifiers.

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

Conversation, hints, and recommendations are Guidance submodules. They consume `PracticeEvent` and may
output a validated `ExerciseProposal`; they cannot import or mutate Practice. Provider responses are
runtime-decoded into a provider-independent result before Guidance chooses retry, fallback, or user
recovery.

## Local UI state

State remains in React only when it has one component owner, has no effect on URL, domain decisions,
network/device work, or another feature, and can be discarded safely on unmount. Examples include
drawer visibility, layout measurements, unsubmitted form input, hover state, and short-lived copy
feedback.

## Mechanical dependency rules

- Feature models cannot import React, Zustand, DOM types, adapters, network clients, system clocks,
  random generators, UUID generators, or timers.
- A feature cannot import another feature's internals. Application composition maps public outputs to
  public intents.
- UI cannot import adapters or mutable stores and cannot expose raw field setters.
- Adapters implement consumer-owned ports; ports never depend on adapters.
- Applications import package exports only; deep imports fail CI.
- `window`, `navigator`, `fetch`, `Date.now`, `Math.random`, `crypto.randomUUID`, and `setTimeout` are
  restricted to adapters or composition infrastructure.
- Every effectful runtime has an executable disposal/cancellation contract.
