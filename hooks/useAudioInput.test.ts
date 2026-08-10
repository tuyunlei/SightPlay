import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createNoteFromMidi } from '../domain/note';

import { AudioInputPort, UseAudioInputDependencies, useAudioInput } from './useAudioInput';

describe('useAudioInput', () => {
  let processor: AudioInputPort;
  let nextFrame: FrameRequestCallback | undefined;
  let dependencies: UseAudioInputDependencies;

  beforeEach(() => {
    processor = {
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn(),
      getPitch: vi.fn().mockReturnValue(null),
    };
    nextFrame = undefined;
    dependencies = {
      createProcessor: () => processor,
      requestFrame: vi.fn((callback) => {
        nextFrame = callback;
        return 17;
      }),
      cancelFrame: vi.fn(),
    };
  });

  it('starts the injected processor and begins pitch detection', async () => {
    const onStart = vi.fn();
    const { result } = renderHook(() =>
      useAudioInput({ onNoteDetected: vi.fn(), onStart, dependencies })
    );

    await act(() => result.current.start());

    expect(processor.start).toHaveBeenCalledOnce();
    expect(onStart).toHaveBeenCalledOnce();
    expect(dependencies.requestFrame).toHaveBeenCalledOnce();
  });

  it('delivers detected pitch to the latest callback', async () => {
    const note = createNoteFromMidi(69, -1);
    vi.mocked(processor.getPitch).mockReturnValue(note);
    const firstCallback = vi.fn();
    const latestCallback = vi.fn();
    const { result, rerender } = renderHook(
      ({ onNoteDetected }) => useAudioInput({ onNoteDetected, dependencies }),
      { initialProps: { onNoteDetected: firstCallback } }
    );

    await act(() => result.current.start());
    firstCallback.mockClear();
    rerender({ onNoteDetected: latestCallback });
    act(() => nextFrame?.(0));

    expect(latestCallback).toHaveBeenCalledWith(note);
    expect(firstCallback).not.toHaveBeenCalled();
  });

  it('reports startup failures without entering the detection loop', async () => {
    vi.mocked(processor.start).mockRejectedValue(new Error('permission denied'));
    const onError = vi.fn();
    const { result } = renderHook(() =>
      useAudioInput({ onNoteDetected: vi.fn(), onError, dependencies })
    );

    await act(() => result.current.start());

    expect(onError).toHaveBeenCalledWith(expect.any(Error));
    expect(dependencies.requestFrame).not.toHaveBeenCalled();
  });

  it('stops the processor and cancels its scheduled frame', async () => {
    const onStop = vi.fn();
    const { result } = renderHook(() =>
      useAudioInput({ onNoteDetected: vi.fn(), onStop, dependencies })
    );
    await act(() => result.current.start());

    act(() => result.current.stop());

    expect(processor.stop).toHaveBeenCalledOnce();
    expect(dependencies.cancelFrame).toHaveBeenCalledWith(17);
    expect(onStop).toHaveBeenCalledOnce();
  });

  it('releases the processor when the hook unmounts', () => {
    const { unmount } = renderHook(() => useAudioInput({ onNoteDetected: vi.fn(), dependencies }));

    unmount();

    expect(processor.stop).toHaveBeenCalledOnce();
  });
});
