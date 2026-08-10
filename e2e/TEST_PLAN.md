# E2E Risk and Evidence Matrix

This inventory tracks production risks and the evidence that protects them. It is not a feature
percentage or test-count target. Add a scenario only when it detects a named regression that a lower
test layer cannot detect more directly.

| Risk boundary                      | Required evidence                                                                                                                            | Automated tier           | Named gap                                                                    |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | ---------------------------------------------------------------------------- |
| App boot/navigation                | Entry states render; key navigation does not blank the app; unexpected page errors, same-origin request failures, and HTTP 5xx fail the test | stable Chromium          | Visual fidelity is not certified                                             |
| Registration/session/login/logout  | Chromium virtual WebAuthn registration/login with real signature verification; Chromium/WebKit signed HttpOnly session, refresh, and logout  | system Chromium + WebKit | Linux WebKit has no virtual WebAuthn; hardware Safari/biometrics required    |
| Authentication recovery intent     | User cancellation, service failure, and explicit registration preserve their intended recovery actions instead of collapsing into one state  | React integration        | User-cancelled login recovery is an observed escape pending regression proof |
| AI chat wiring                     | UI through the real chat handler with a deterministic upstream; failure and loading behavior with controlled boundaries                      | stable + system          | Provider availability is a canary, not a merge gate                          |
| Practice state transitions         | Correct/wrong notes, score, streak, settings, song progress, and completion observed through UI/state contracts                              | stable Chromium          | Physical timing/feel is not certified                                        |
| Web MIDI adapter                   | Browser Web MIDI initialization, hot input events, both-hands queue, detection, and scoring                                                  | stable Chromium          | Real keyboard/driver/permission behavior requires an opt-in hardware run     |
| Microphone adapter                 | Generated A4 WAV through Chromium fake capture, real `getUserMedia`, Web Audio analyser, pitch detection, and scoring                        | audio Chromium           | Real room noise, latency, devices, and permission UX require hardware        |
| Production bundle/browser variance | Built Vite preview plus real auth/chat handlers in Chromium and WebKit                                                                       | system Chromium + WebKit | Safari/iOS hardware remains opt-in                                           |
| Deployed preview                   | Trusted HTTPS URL serves a usable entry state without unexpected runtime failures                                                            | manual preview workflow  | Auth mutation is intentionally excluded from arbitrary preview URLs          |
| Gemini provider                    | Trusted scheduled/manual job calls the real provider through SightPlay's real authenticated handler and validates the response contract      | provider canary          | Never runs with secrets on pull requests                                     |

## Admission rule

A new E2E scenario must name the regression it catches, use the lowest necessary tier, control every
non-target dependency, and wait on observable state rather than a guessed delay. Static copy,
implementation shape, mock behavior, and inventory completeness are not E2E acceptance criteria.

Hardware checks are named evidence gaps, not silent passes. Record device/browser identity and the
observed path when they are run; do not claim hardware certification from synthetic Web MIDI or fake
audio capture.
