import { useCallback, useEffect, useRef } from 'react';

import { AudioProcessor } from '../services/audioService';
import { Note } from '../types';

interface UseAudioInputOptions {
  onNoteDetected: (note: Note | null) => void;
  onStart?: () => void;
  onStop?: () => void;
  onError?: (error: unknown) => void;
}

export const useAudioInput = ({ onNoteDetected, onStart, onStop, onError }: UseAudioInputOptions) => {
  const audioProcessor = useRef<AudioProcessor>(new AudioProcessor());
  const rafId = useRef<number>(0);

  const stop = useCallback(() => {
    audioProcessor.current.stop();
    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
    }
    onStop?.();
  }, [onStop]);

  const detectLoop = useCallback(() => {
    const note = audioProcessor.current.getPitch();
    onNoteDetected(note);
    rafId.current = requestAnimationFrame(detectLoop);
  }, [onNoteDetected]);

  const start = useCallback(async () => {
    try {
      await audioProcessor.current.start();
      onStart?.();
      detectLoop();
    } catch (error) {
      onError?.(error);
    }
  }, [detectLoop, onError, onStart]);

  useEffect(() => () => stop(), [stop]);

  return { start, stop };
};
