import { usePracticeStore } from '../../../store/practiceStore';
import { Note } from '../../../types';
import type { PracticeActions } from '../slices';

export const useDetectedNoteUpdater =
  (setDetectedNote: PracticeActions['setDetectedNote']) => (note: Note | null) => {
    const prev = usePracticeStore.getState().detectedNote;
    if (!note && !prev) return;
    if (!note || !prev) {
      setDetectedNote(note);
      return;
    }
    if (note.midi === prev.midi) return;
    setDetectedNote(note);
  };
