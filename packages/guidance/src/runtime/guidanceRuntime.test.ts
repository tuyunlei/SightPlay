import { describe, expect, it, vi } from 'vitest';

import type { GuidanceChatResult } from '../model/types';
import type { GuidancePorts } from '../ports';

import { createGuidanceRuntime } from './guidanceRuntime';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function harness(result?: ReturnType<typeof deferred<GuidanceChatResult>>) {
  let now = 100_000;
  const timers = new Set<() => void>();
  const signals: AbortSignal[] = [];
  const ports: GuidancePorts = {
    clock: { now: () => now },
    scheduler: {
      schedule: (_delay, task) => {
        const wrapped = () => {
          timers.delete(wrapped);
          task();
        };
        timers.add(wrapped);
        return () => timers.delete(wrapped);
      },
    },
    chat: {
      request: vi.fn((_request, signal) => {
        signals.push(signal);
        return (
          result?.promise ??
          Promise.resolve({
            ok: true as const,
            reply: { replyText: 'Keep going.', challengeData: null },
          })
        );
      }),
    },
  };
  return { ports, signals, timers, setNow: (value: number) => (now = value) };
}

describe('Guidance runtime lifecycle', () => {
  it('serializes provider results and publishes typed outputs', async () => {
    const pending = deferred<GuidanceChatResult>();
    const test = harness(pending);
    const runtime = createGuidanceRuntime(test.ports, { clef: 'treble', language: 'en' });
    const output = vi.fn();
    runtime.onOutput(output);
    runtime.start();
    runtime.dispatch({ kind: 'sendMessage', text: 'Create a challenge' });
    expect(runtime.getView().isLoading).toBe(true);

    pending.resolve({
      ok: true,
      reply: {
        replyText: 'Try it.',
        challengeData: { title: 'Scale', description: 'Ascending', notes: ['C4'] },
      },
    });
    await pending.promise;
    await vi.waitFor(() => expect(runtime.getView().isLoading).toBe(false));
    expect(output).toHaveBeenCalledWith(expect.objectContaining({ kind: 'exerciseProposed' }));
    runtime.dispose();
  });

  it('aborts requests, cancels timers, and rejects late results after disposal', async () => {
    const pending = deferred<GuidanceChatResult>();
    const test = harness(pending);
    const runtime = createGuidanceRuntime(test.ports, { clef: 'treble', language: 'en' });
    const output = vi.fn();
    runtime.onOutput(output);
    runtime.start();
    runtime.dispatch({ kind: 'sendMessage', text: 'Create a challenge' });
    expect(test.signals).toHaveLength(1);

    runtime.dispose();
    expect(test.signals[0].aborted).toBe(true);
    expect(test.timers.size).toBe(0);
    pending.resolve({
      ok: true,
      reply: {
        replyText: 'Late',
        challengeData: { title: 'Late', description: 'Late', notes: ['C4'] },
      },
    });
    await pending.promise;
    await Promise.resolve();
    expect(output).not.toHaveBeenCalled();
  });
});
