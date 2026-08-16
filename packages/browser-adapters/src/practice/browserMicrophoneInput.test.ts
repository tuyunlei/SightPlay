import { describe, expect, it, vi } from 'vitest';

import {
  createBrowserMicrophoneInput,
  type BrowserMicrophoneEnvironment,
} from './browserMicrophoneInput';

function microphoneFixture() {
  const stopTrack = vi.fn();
  const disconnect = vi.fn();
  const close = vi.fn(async () => {});
  const cancelFrame = vi.fn();
  const frameCallbacks = new Map<number, FrameRequestCallback>();
  let nextFrame = 0;
  const analyser = {
    fftSize: 4_096,
    getFloatTimeDomainData: (samples: Float32Array) => samples.fill(0),
  };
  const context = {
    sampleRate: 44_100,
    createAnalyser: () => analyser,
    createMediaStreamSource: () => ({ connect: vi.fn(), disconnect }),
    close,
  };
  const stream = { getTracks: () => [{ stop: stopTrack }] };
  const environment: BrowserMicrophoneEnvironment = {
    getUserMedia: vi.fn(async () => stream as unknown as MediaStream),
    createAudioContext: () => context as unknown as AudioContext,
    requestFrame: (callback) => {
      nextFrame += 1;
      frameCallbacks.set(nextFrame, callback);
      return nextFrame;
    },
    cancelFrame: (handle) => {
      cancelFrame(handle);
      frameCallbacks.delete(handle);
    },
  };
  return { environment, stopTrack, disconnect, close, cancelFrame, frameCallbacks };
}

describe('browser microphone lifecycle', () => {
  it('owns capture, animation polling, and complete teardown', async () => {
    const fixture = microphoneFixture();
    const observer = vi.fn();
    const port = createBrowserMicrophoneInput(fixture.environment);
    await port.start(observer);

    expect(observer).toHaveBeenCalledWith(null);
    expect(fixture.frameCallbacks.size).toBe(1);
    port.dispose();

    expect(fixture.cancelFrame).toHaveBeenCalledOnce();
    expect(fixture.stopTrack).toHaveBeenCalledOnce();
    expect(fixture.disconnect).toHaveBeenCalledOnce();
    expect(fixture.close).toHaveBeenCalledOnce();
    expect(fixture.frameCallbacks.size).toBe(0);
  });

  it('stops a stream whose permission result arrives after disposal', async () => {
    const fixture = microphoneFixture();
    let resolveStream!: (stream: MediaStream) => void;
    fixture.environment.getUserMedia = () =>
      new Promise((resolve) => {
        resolveStream = resolve;
      });
    const port = createBrowserMicrophoneInput(fixture.environment);
    const started = port.start(vi.fn());
    port.dispose();
    resolveStream({ getTracks: () => [{ stop: fixture.stopTrack }] } as unknown as MediaStream);
    await started;

    expect(fixture.stopTrack).toHaveBeenCalledOnce();
    expect(fixture.frameCallbacks.size).toBe(0);
  });
});
