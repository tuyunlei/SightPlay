# Autonomous E2E Operations

The E2E system is designed to give an AI agent enough deterministic evidence and failure context to
iterate without a person repeatedly reproducing browser failures. It reduces routine manual testing;
it does not turn synthetic browser checks into hardware or production certification.

## Tiers

| Command                      | Purpose                                                                            | External mutation/secret                |
| ---------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------- |
| `pnpm run test:e2e`          | Merge gate: stable Chromium, real local system Chromium/WebKit, fake-capture audio | None                                    |
| `pnpm run test:e2e:critical` | Fast local check for tagged critical journeys                                      | None                                    |
| `pnpm run test:e2e:system`   | Built preview plus real local auth/session/chat handlers                           | None                                    |
| `pnpm run test:e2e:preview`  | Read-only smoke against `SIGHTPLAY_E2E_EXTERNAL_BASE_URL`                          | Trusted URL only                        |
| `pnpm run test:e2e:provider` | Real Gemini contract through the authenticated local handler                       | `GEMINI_API_KEY`; trusted branches only |

Physical MIDI keyboards, microphones, Face ID/Touch ID, and iOS Safari are opt-in evidence. A person or
device lab must provide the device identity and result; CI does not silently substitute a mock and call
that hardware coverage.

## Agent loop

1. Run the narrowest failing scenario with the exact reproduction command from
   `test-results/ai-failures.json`.
2. Read `runtime-diagnostics.json` first, then the Playwright trace, screenshot, and video. Unexpected
   page exceptions, same-origin request failures, and HTTP 5xx are failures even if a final locator
   assertion happens to pass.
3. Fix the production cause or improve the boundary model. Do not add sleeps or loosen assertions to
   hide nondeterminism.
4. Repeat the narrow scenario, then its tier, then the complete gate. CI retries once only to classify a
   flake and fails the job when a retry is needed.
5. Preserve artifacts and report the exact tier, browser, port, and any named evidence gaps.

Each system test gets a unique run ID. The E2E-only control endpoint can reset scoped in-memory KV,
seed an invite, and select a typed provider response. It is enabled only by `SIGHTPLAY_E2E_MODE=1`; it
is not part of a production build or deployment.

The main suite owns loopback ports 4173 (dev/API) and 4174 (built preview), uses strict ports, and does
not reuse an unknown process. Override them with `SIGHTPLAY_E2E_PORT` and
`SIGHTPLAY_E2E_PREVIEW_PORT`.

## Trust boundaries

- Pull-request CI never receives the Gemini secret.
- The provider canary runs only from the repository's scheduled/manual workflow context and incurs a
  small real provider call.
- Remote preview smoke is read-only and accepts an explicit trusted HTTPS URL. It does not register,
  delete, or write preview data.
- Local system tests use real crypto verification, cookies, handlers, and isolated state. The virtual
  authenticator adapter only fills browser fields absent from Playwright's synthetic credential and
  normalizes the counter to the valid sync-passkey value of zero.
