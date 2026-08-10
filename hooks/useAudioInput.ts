import { useEffect, useRef, useState } from 'react';

import { AudioProcessor } from '../services/audioService';
import { Note } from '../types';

interface UseAudioInputOptions {
  onNoteDetected: (note: Note | null) => void;
  onStart?: () => void;
  onStop?: () => void;
  onError?: (error: unknown) => void;
  dependencies?: UseAudioInputDependencies;
}

export interface AudioInputPort {
  start: () => Promise<void>;
  stop: () => void;
  getPitch: () => Note | null;
}

export interface UseAudioInputDependencies {
  createProcessor: () => AudioInputPort;
  requestFrame: (callback: FrameRequestCallback) => number;
  cancelFrame: (requestId: number) => void;
}

const browserAudioInputDependencies: UseAudioInputDependencies = {
  createProcessor: () => new AudioProcessor(),
  requestFrame: (callback) => requestAnimationFrame(callback),
  cancelFrame: (requestId) => cancelAnimationFrame(requestId),
};

export const useAudioInput = ({
  onNoteDetected,
  onStart,
  onStop,
  onError,
  dependencies = browserAudioInputDependencies,
}: UseAudioInputOptions) => {
  const [audioProcessor] = useState(dependencies.createProcessor);
  const rafId = useRef<number>(0);
  const onNoteDetectedRef = useRef(onNoteDetected);
  const onStopRef = useRef(onStop);
  onNoteDetectedRef.current = onNoteDetected;
  onStopRef.current = onStop;

  const stop = () => {
    audioProcessor.stop();
    if (rafId.current) {
      dependencies.cancelFrame(rafId.current);
    }
    onStop?.();
  };

  const detectLoop = () => {
    const note = audioProcessor.getPitch();
    onNoteDetectedRef.current(note);
    rafId.current = dependencies.requestFrame(detectLoop);
  };

  const start = async () => {
    try {
      await audioProcessor.start();
      onStart?.();
      detectLoop();
    } catch (error) {
      onError?.(error);
    }
  };

  useEffect(() => {
    const processor = audioProcessor;
    return () => {
      processor.stop();
      if (rafId.current) {
        dependencies.cancelFrame(rafId.current);
      }
      onStopRef.current?.();
    };
  }, [audioProcessor, dependencies]);

  return { start, stop };
};
