# 0001 — Practice Decisions and Runtime Effects

Status: accepted

Date: 2026-08-10

## Context

Practice behavior was distributed across Zustand field setters, React hooks, mutable refs, direct
service construction, and timers. A correct-note event required several independent state writes, and
tests commonly replaced whole modules to observe the orchestration. That made intentional refactors
noisy and allowed intermediate state or stale runtime callbacks to become part of the behavior.

## Decision

Practice state transitions use typed `PracticeAction` values and the pure `reducePractice` function.
The reducer returns the complete next `PracticeState` plus typed `PracticeEffect` descriptions. Zustand
remains the React-facing state adapter and commits each reduction atomically.

React-side effect handling owns clocks, scheduling, queue generation, and callbacks. Browser-facing
Audio, MIDI, AI, clock, and scheduler capabilities are injected through narrow consumer-owned
interfaces with production defaults. This is a feature pattern, not a generic Store framework.

## Consequences

- Business branches can be tested without React, timers, or module mocks.
- Delayed work is explicit, deterministic in tests, and cancelled when its owning hook unmounts.
- Zustand and existing component APIs remain available, so migration can proceed incrementally.
- Actions that only preserve a legacy setter API remain transitional; new practice decisions should use
  semantic actions rather than adding coordinated setter sequences.
- Real MIDI and microphone behavior still require their separate adapter and hardware evidence.

## Verification

- `.dependency-cruiser.cjs` prevents `domain/` and `store/` from depending on UI or runtime adapters.
- `domain/practiceCore.test.ts` proves decision branches and emitted effects.
- Adapter and hook tests inject services and a deterministic scheduler.
- Existing assembled MIDI integration and Playwright journeys protect browser wiring and user paths.
