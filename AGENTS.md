# AGENTS.md — SightPlay

## Instruction governance

Keep instructions limited to stable constraints that a capable cold agent would otherwise miss and
whose violation is costly. Put mechanically enforceable boundaries in types, dependency rules, lint,
or CI; put procedures in guides and historical reasoning in decisions. Update an affected instruction
in the same change as the constraint, and delete stale or duplicated rules. Follow
`docs/guides/agents-md-governance.md` when editing any `AGENTS.md`.

## Architecture

- Dependency direction is enforced by `.dependency-cruiser.cjs`. Do not weaken a rule to make a new
  import pass; change the ownership or introduce an explicit boundary.
- Keep product decisions independent of React and browser APIs. React hooks adapt state and effects to
  the UI; services adapt Web MIDI, Web Audio, network, storage, clocks, and schedulers.
- A feature consumes external capabilities through narrow interfaces and receives implementations at
  its composition boundary. Do not construct a concrete service inside business orchestration when a
  test or alternate runtime must replace it.
- Use MIDI numbers as note identity. Create notes through `createNoteFromMidi()` rather than duplicating
  pitch/name/frequency conversion.
- User-visible copy goes through `i18n/`; do not hard-code it in components, hooks, or services.

## Tests

Tests protect observable behavior, domain decisions, boundary contracts, or known regressions. CI does
not collect or gate line coverage. Do not add tests for static text/prompt containment, simple registry
presence, return-object shape, setter forwarding, mocks themselves, or implementation-only wiring.

Prefer pure decision tests, adapter contract tests, assembled React tests, and Playwright user paths at
the boundary each can actually prove. A fake skips a real path: name that gap and cover important real
adapter behavior separately. Follow `docs/guides/testing-strategy.md` when adding or removing tests.

## Safety and workflow

- Work on a feature branch from `develop`; changes enter `develop` through a reviewed PR. Never deploy
  or merge `develop` to `main` unless the user explicitly requests production release.
- Never commit `.env*`, credentials, production data, or copied platform secrets.
- Real MIDI hardware, microphone quality, passkeys, and production services require explicit runtime
  evidence. Mock, jsdom, and Playwright simulation do not prove those boundaries.
