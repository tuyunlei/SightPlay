import { useEffect, useRef } from 'react';
import { MidiService } from '../services/midiService';

interface UseMidiInputOptions {
  onNoteOn: (midiNumber: number) => void;
  onNoteOff?: (midiNumber: number) => void;
  onConnectionChange?: (connected: boolean) => void;
}

export const useMidiInput = ({ onNoteOn, onNoteOff, onConnectionChange }: UseMidiInputOptions) => {
  const midiService = useRef<MidiService>(new MidiService());

  useEffect(() => {
    midiService.current.initialize(onNoteOn, onConnectionChange, onNoteOff);
  }, [onNoteOn, onConnectionChange, onNoteOff]);
};
