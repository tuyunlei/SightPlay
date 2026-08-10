import { useEffect, useRef, useState } from 'react';

import { MidiService } from '../services/midiService';

interface UseMidiInputOptions {
  onNoteOn: (midiNumber: number) => void;
  onNoteOff?: (midiNumber: number) => void;
  onConnectionChange?: (connected: boolean) => void;
  createService?: () => MidiInputPort;
}

export interface MidiInputPort {
  initialize: (
    onNoteOn: (midi: number) => void,
    onConnectionChange?: (connected: boolean) => void,
    onNoteOff?: (midi: number) => void
  ) => Promise<void>;
}

const createBrowserMidiService = (): MidiInputPort => new MidiService();

export const useMidiInput = ({
  onNoteOn,
  onNoteOff,
  onConnectionChange,
  createService = createBrowserMidiService,
}: UseMidiInputOptions) => {
  const [midiService] = useState(createService);

  // Store callbacks in refs so MIDI binding doesn't depend on their identity
  const onNoteOnRef = useRef(onNoteOn);
  const onNoteOffRef = useRef(onNoteOff);
  const onConnectionChangeRef = useRef(onConnectionChange);
  onNoteOnRef.current = onNoteOn;
  onNoteOffRef.current = onNoteOff;
  onConnectionChangeRef.current = onConnectionChange;

  useEffect(() => {
    void midiService.initialize(
      (midi: number) => onNoteOnRef.current(midi),
      (connected: boolean) => onConnectionChangeRef.current?.(connected),
      (midi: number) => onNoteOffRef.current?.(midi)
    );
  }, [midiService]); // Service is created once; callbacks are accessed via refs
};
