/**
 * WebMIDI mock script for E2E tests.
 *
 * This module exports a self-contained script string that can be injected via
 * `page.addInitScript({ content: webmidiMockScript })` BEFORE the app loads.
 *
 * It overrides `navigator.requestMIDIAccess` with a fake implementation so
 * the real MidiService → useMidiInput → usePracticeSession pipeline runs end-
 * to-end without physical hardware.
 *
 * Window globals exposed after injection:
 *   __simulateMidiNoteOn(midi: number)  — sends [0x90, midi, 127]
 *   __simulateMidiNoteOff(midi: number) — sends [0x80, midi, 0]
 *   __simulateMidiConnect()             — hot-plugs a second MIDI device
 */
export const webmidiMockScript = /* js */ `(function () {
  'use strict';

  // ── fake MIDIInput ─────────────────────────────────────────────────────────

  var fakeMidiInput = {
    id: 'e2e-mock-input-1',
    name: 'E2E Mock MIDI Keyboard',
    manufacturer: 'SightPlay E2E',
    type: 'input',
    state: 'connected',
    connection: 'open',
    onmidimessage: null,
    onstatechange: null,
    open: function () { return Promise.resolve(fakeMidiInput); },
    close: function () { return Promise.resolve(fakeMidiInput); },
    addEventListener: function () {},
    removeEventListener: function () {},
    dispatchEvent: function () { return true; },
  };

  // ── fake MIDIAccess ────────────────────────────────────────────────────────

  var inputsMap = new Map();
  inputsMap.set(fakeMidiInput.id, fakeMidiInput);

  var fakeMidiAccess = {
    inputs: inputsMap,
    outputs: new Map(),
    sysexEnabled: false,
    onstatechange: null,
  };

  // ── override navigator.requestMIDIAccess ───────────────────────────────────

  Object.defineProperty(navigator, 'requestMIDIAccess', {
    configurable: true,
    writable: true,
    value: function () {
      return Promise.resolve(fakeMidiAccess);
    },
  });

  // ── public simulation helpers ──────────────────────────────────────────────

  /** Dispatch a Note On message to the fake input's onmidimessage handler. */
  window.__simulateMidiNoteOn = function (midi) {
    if (fakeMidiInput.onmidimessage) {
      fakeMidiInput.onmidimessage({ data: new Uint8Array([0x90, midi, 127]) });
    }
  };

  /** Dispatch a Note Off message to the fake input's onmidimessage handler. */
  window.__simulateMidiNoteOff = function (midi) {
    if (fakeMidiInput.onmidimessage) {
      fakeMidiInput.onmidimessage({ data: new Uint8Array([0x80, midi, 0]) });
    }
  };

  /**
   * Simulate connecting a second MIDI device (hot-plug).
   * Triggers the MIDIAccess onstatechange handler so MidiService binds it.
   */
  window.__simulateMidiConnect = function () {
    var newInput = {
      id: 'e2e-mock-input-2',
      name: 'E2E Mock MIDI Keyboard 2',
      manufacturer: 'SightPlay E2E',
      type: 'input',
      state: 'connected',
      connection: 'open',
      onmidimessage: null,
      onstatechange: null,
      open: function () { return Promise.resolve(newInput); },
      close: function () { return Promise.resolve(newInput); },
      addEventListener: function () {},
      removeEventListener: function () {},
      dispatchEvent: function () { return true; },
    };
    inputsMap.set(newInput.id, newInput);
    if (fakeMidiAccess.onstatechange) {
      fakeMidiAccess.onstatechange({ port: newInput });
    }
  };
})();`;
