import { describe, expect, it, vi } from 'vitest';

import { createFiniteExercise, createMidiPitch } from '../model/exercise';
import type { ExercisePlan, MidiPitch } from '../model/types';
import type { MidiInputSignal, PracticePorts } from '../ports';

import { createPracticeRuntime } from './practiceRuntime';

function exercise(id = 'exercise', pitches = [60]): ExercisePlan {
  const result = createFiniteExercise({
    source: 'coach',
    id,
    clef: 'treble',
    frames: [{ pitches }],
  });
  if (!result.ok) throw new Error('invalid test exercise');
  return result.value;
}

function midi(value: number): MidiPitch {
  const pitch = createMidiPitch(value);
  if (pitch === null) throw new Error('invalid test pitch');
  return pitch;
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function harness(overrides?: Partial<PracticePorts['microphone']>) {
  let now = 100;
  let midiObserver: ((signal: MidiInputSignal) => void) | null = null;
  const scheduled = new Set<() => void>();
  const ports: PracticePorts = {
    clock: { now: () => now },
    scheduler: {
      schedule: (_delayMs, task) => {
        const scheduledTask = () => {
          scheduled.delete(scheduledTask);
          task();
        };
        scheduled.add(scheduledTask);
        return () => scheduled.delete(scheduledTask);
      },
    },
    seed: { nextSeed: () => 42 },
    midi: {
      start: vi.fn(async (observer) => {
        midiObserver = observer;
      }),
      dispose: vi.fn(),
    },
    microphone: {
      start: vi.fn(async () => {}),
      stop: vi.fn(),
      dispose: vi.fn(),
      ...overrides,
    },
  };
  return {
    ports,
    scheduled,
    emitMidi(signal: MidiInputSignal) {
      midiObserver?.(signal);
    },
    setNow(value: number) {
      now = value;
    },
  };
}

describe('Practice runtime lifecycle', () => {
  it('serializes input, publishes completion, and disposes every active capability', async () => {
    const test = harness();
    const runtime = createPracticeRuntime(test.ports, exercise());
    const output = vi.fn();
    runtime.onOutput(output);
    runtime.start();
    await vi.waitFor(() => expect(test.ports.midi.start).toHaveBeenCalledOnce());

    test.emitMidi({ kind: 'pressed', pitch: midi(60) });
    test.setNow(120);
    test.emitMidi({ kind: 'released', pitch: midi(60) });
    expect(runtime.getView().completedCount).toBe(1);
    expect(test.scheduled.size).toBe(2);

    test.setNow(1_120);
    [...test.scheduled].forEach((task) => task());
    expect(output).toHaveBeenCalledOnce();

    runtime.dispose();
    expect(test.ports.midi.dispose).toHaveBeenCalledOnce();
    expect(test.ports.microphone.dispose).toHaveBeenCalledOnce();
    expect(test.scheduled.size).toBe(0);
  });

  it('rejects a microphone start result from an exercise that has been replaced', async () => {
    const pending = deferred();
    const test = harness({ start: vi.fn(() => pending.promise) });
    const runtime = createPracticeRuntime(test.ports, exercise('first'));
    runtime.start();
    runtime.dispatch({ kind: 'toggleMicrophone' });
    runtime.dispatch({ kind: 'startExercise', plan: exercise('replacement', [62]) });

    pending.resolve();
    await pending.promise;
    await Promise.resolve();

    expect(runtime.getState()).toMatchObject({
      plan: { metadata: { id: 'replacement' } },
      microphone: 'inactive',
    });
    runtime.dispose();
  });

  it('invalidates callbacks and pending timers across React-style lifecycle replay', async () => {
    const test = harness();
    const runtime = createPracticeRuntime(test.ports, exercise());
    runtime.start();
    await vi.waitFor(() => expect(test.ports.midi.start).toHaveBeenCalledOnce());
    const firstEpoch = runtime.getState().epoch;

    runtime.dispose();
    test.emitMidi({ kind: 'pressed', pitch: midi(60) });
    expect(runtime.getState().heldPitches).toEqual([]);

    runtime.start();
    await vi.waitFor(() => expect(test.ports.midi.start).toHaveBeenCalledTimes(2));
    expect(runtime.getState().epoch).not.toBe(firstEpoch);
    runtime.dispose();
  });
});
