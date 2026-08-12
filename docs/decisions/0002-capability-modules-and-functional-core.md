# 0002 — Capability Modules and Functional Core

Status: accepted

Date: 2026-08-13

## Context

SightPlay's product workflows are currently distributed across React component state, hooks, Zustand
field setters, refs, browser globals, services, and route handlers. Technical-layer dependency rules
do not establish a unique owner for a business fact, so illegal combinations and lifecycle leaks remain
possible even when the dependency graph and tests pass.

## Decision

Organize the application as a modular monolith of product capabilities. Each stateful capability owns
a pure state/action/effect transition, consumer-owned ports, a disposable effect runtime, a React
ViewModel/Intent adapter, and an explicit public export. Applications are composition roots and are the
only place that maps one capability's typed output to another capability's intent.

Use private workspace packages and export maps to enforce the boundary. Do not introduce a generic
Manager, Coordinator, service locator, global event bus, global application state, or mandatory state
machine for local presentation state.

## Consequences

- Business behavior can be proven without React or browser APIs.
- Capabilities can be created, replaced, and disposed independently.
- Cross-capability workflows become visible and typed instead of hiding in callbacks or shared stores.
- There is additional contract code for genuinely stateful capabilities.
- Migration must remove each legacy owner at cutover; long-lived dual state is unsupported.

## Verification

Package exports and dependency fitness rules enforce isolation and model purity. Pure transition tests,
adapter contract suites, assembled feature tests, and application lifecycle tests prove each layer.
