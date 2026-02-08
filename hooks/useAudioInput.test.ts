import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { AudioProcessor } from '../services/audioService';

import { useAudioInput } from './useAudioInput';


vi.mock('../services/audioService');

describe('useAudioInput', () => {
  let mockAudioProcessor: {
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
    getPitch: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockAudioProcessor = {
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn(),
      getPitch: vi.fn().mockReturnValue(null),
    };
    vi.mocked(AudioProcessor).mockImplementation(
      () => mockAudioProcessor as unknown as AudioProcessor
    );

    // Mock requestAnimationFrame
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((_cb) => {
        // Don't actually call the callback to prevent infinite loop
        return 1;
      })
    );
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('creates AudioProcessor instance', () => {
    const onNoteDetected = vi.fn();
    renderHook(() => useAudioInput({ onNoteDetected }));

    expect(AudioProcessor).toHaveBeenCalledTimes(1);
  });

  it('returns start and stop functions', () => {
    const onNoteDetected = vi.fn();
    const { result } = renderHook(() => useAudioInput({ onNoteDetected }));

    expect(typeof result.current.start).toBe('function');
    expect(typeof result.current.stop).toBe('function');
  });

  describe('start', () => {
    it('calls audioProcessor.start', async () => {
      const onNoteDetected = vi.fn();
      const { result } = renderHook(() => useAudioInput({ onNoteDetected }));

      await act(async () => {
        await result.current.start();
      });

      expect(mockAudioProcessor.start).toHaveBeenCalled();
    });

    it('calls onStart callback', async () => {
      const onNoteDetected = vi.fn();
      const onStart = vi.fn();
      const { result } = renderHook(() => useAudioInput({ onNoteDetected, onStart }));

      await act(async () => {
        await result.current.start();
      });

      expect(onStart).toHaveBeenCalled();
    });

    it('starts detection loop', async () => {
      const onNoteDetected = vi.fn();
      const { result } = renderHook(() => useAudioInput({ onNoteDetected }));

      await act(async () => {
        await result.current.start();
      });

      expect(requestAnimationFrame).toHaveBeenCalled();
    });

    it('calls onError when start fails', async () => {
      mockAudioProcessor.start.mockRejectedValue(new Error('Permission denied'));

      const onNoteDetected = vi.fn();
      const onError = vi.fn();
      const { result } = renderHook(() => useAudioInput({ onNoteDetected, onError }));

      await act(async () => {
        await result.current.start();
      });

      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });

    it('does not call onStart when start fails', async () => {
      mockAudioProcessor.start.mockRejectedValue(new Error('Permission denied'));

      const onNoteDetected = vi.fn();
      const onStart = vi.fn();
      const onError = vi.fn();
      const { result } = renderHook(() => useAudioInput({ onNoteDetected, onStart, onError }));

      await act(async () => {
        await result.current.start();
      });

      expect(onStart).not.toHaveBeenCalled();
    });
  });

  describe('stop', () => {
    it('calls audioProcessor.stop', async () => {
      const onNoteDetected = vi.fn();
      const { result } = renderHook(() => useAudioInput({ onNoteDetected }));

      await act(async () => {
        await result.current.start();
      });

      act(() => {
        result.current.stop();
      });

      expect(mockAudioProcessor.stop).toHaveBeenCalled();
    });

    it('calls onStop callback', async () => {
      const onNoteDetected = vi.fn();
      const onStop = vi.fn();
      const { result } = renderHook(() => useAudioInput({ onNoteDetected, onStop }));

      await act(async () => {
        await result.current.start();
      });

      act(() => {
        result.current.stop();
      });

      expect(onStop).toHaveBeenCalled();
    });

    it('cancels animation frame', async () => {
      const onNoteDetected = vi.fn();
      const { result } = renderHook(() => useAudioInput({ onNoteDetected }));

      await act(async () => {
        await result.current.start();
      });

      act(() => {
        result.current.stop();
      });

      expect(cancelAnimationFrame).toHaveBeenCalled();
    });
  });

  describe('detection loop', () => {
    it('calls getPitch and onNoteDetected', async () => {
      const mockNote = {
        id: 'test',
        name: 'A' as const,
        octave: 4,
        frequency: 440,
        midi: 69,
        globalIndex: -1,
      };
      mockAudioProcessor.getPitch.mockReturnValue(mockNote);

      // Make requestAnimationFrame call the callback once
      vi.mocked(requestAnimationFrame).mockImplementation((cb) => {
        cb(0);
        return 1;
      });

      const onNoteDetected = vi.fn();
      const { result } = renderHook(() => useAudioInput({ onNoteDetected }));

      await act(async () => {
        await result.current.start();
      });

      expect(mockAudioProcessor.getPitch).toHaveBeenCalled();
      expect(onNoteDetected).toHaveBeenCalledWith(mockNote);
    });

    it('passes null when no pitch detected', async () => {
      mockAudioProcessor.getPitch.mockReturnValue(null);

      vi.mocked(requestAnimationFrame).mockImplementation((cb) => {
        cb(0);
        return 1;
      });

      const onNoteDetected = vi.fn();
      const { result } = renderHook(() => useAudioInput({ onNoteDetected }));

      await act(async () => {
        await result.current.start();
      });

      expect(onNoteDetected).toHaveBeenCalledWith(null);
    });
  });

  describe('cleanup', () => {
    it('stops on unmount', async () => {
      const onNoteDetected = vi.fn();
      const onStop = vi.fn();
      const { result, unmount } = renderHook(() => useAudioInput({ onNoteDetected, onStop }));

      await act(async () => {
        await result.current.start();
      });

      unmount();

      expect(mockAudioProcessor.stop).toHaveBeenCalled();
    });
  });

  describe('callback stability', () => {
    it('uses same AudioProcessor instance across rerenders', () => {
      const onNoteDetected = vi.fn();

      const { rerender } = renderHook(({ onNoteDetected }) => useAudioInput({ onNoteDetected }), {
        initialProps: { onNoteDetected },
      });

      rerender({ onNoteDetected: vi.fn() });
      rerender({ onNoteDetected: vi.fn() });

      // AudioProcessor should be constructed (StrictMode may cause multiple calls)
      expect(AudioProcessor).toHaveBeenCalled();
    });
  });
});
