import { useEffect, useRef } from 'react';

import { MidiService } from '../services/midiService';

interface UseMidiInputOptions {
  onNoteOn: (midiNumber: number) => void;
  onNoteOff?: (midiNumber: number) => void;
  onConnectionChange?: (connected: boolean) => void;
}

export const useMidiInput = ({ onNoteOn, onNoteOff, onConnectionChange }: UseMidiInputOptions) => {
  const midiService = useRef<MidiService>(new MidiService());

  // Store callbacks in refs so MIDI binding doesn't depend on their identity
  const onNoteOnRef = useRef(onNoteOn);
  const onNoteOffRef = useRef(onNoteOff);
  const onConnectionChangeRef = useRef(onConnectionChange);
  onNoteOnRef.current = onNoteOn;
  onNoteOffRef.current = onNoteOff;
  onConnectionChangeRef.current = onConnectionChange;

  useEffect(() => {
    midiService.current.initialize(
      (midi: number) => onNoteOnRef.current(midi),
      (connected: boolean) => onConnectionChangeRef.current?.(connected),
      (midi: number) => onNoteOffRef.current?.(midi)
    );
  }, []); // Only initialize once — callbacks are accessed via refs
};
