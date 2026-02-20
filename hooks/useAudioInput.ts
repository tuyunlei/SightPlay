import { useEffect, useRef } from 'react';

import { AudioProcessor } from '../services/audioService';
import { Note } from '../types';

interface UseAudioInputOptions {
  onNoteDetected: (note: Note | null) => void;
  onStart?: () => void;
  onStop?: () => void;
  onError?: (error: unknown) => void;
}

export const useAudioInput = ({
  onNoteDetected,
  onStart,
  onStop,
  onError,
}: UseAudioInputOptions) => {
  const audioProcessor = useRef<AudioProcessor>(new AudioProcessor());
  const rafId = useRef<number>(0);

  const stop = () => {
    audioProcessor.current.stop();
    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
    }
    onStop?.();
  };

  const detectLoop = () => {
    const note = audioProcessor.current.getPitch();
    onNoteDetected(note);
    rafId.current = requestAnimationFrame(detectLoop);
  };

  const start = async () => {
    try {
      await audioProcessor.current.start();
      onStart?.();
      detectLoop();
    } catch (error) {
      onError?.(error);
    }
  };

  useEffect(() => {
    const processor = audioProcessor.current;
    return () => {
      processor.stop();
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
      onStop?.();
    };
  }, [onStop]);

  return { start, stop };
};
