import { MATCH_THRESHOLD_MS } from '../../../config/timings';
import { usePracticeStore } from '../../../store/practiceStore';
import { Note } from '../../../types';
import type { PracticeRefs } from '../slices';

export const useMicNoteHandler = (
  updateDetectedNote: (note: Note | null) => void,
  handleCorrectNote: () => void,
  refs: PracticeRefs
) => {
  const { matchTimer, wrongTimer, hasMistakeForCurrent, isProcessingRef } = refs;

  return (note: Note | null) => {
    const state = usePracticeStore.getState();
    if (!state.isListening) return;

    updateDetectedNote(note);

    const target = state.noteQueue[0];
    if (!target || isProcessingRef.current) return;

    if (note) {
      if (note.midi === target.midi) {
        wrongTimer.current = 0;
        const now = Date.now();
        if (matchTimer.current === 0) matchTimer.current = now;
        if (now - matchTimer.current > MATCH_THRESHOLD_MS) {
          handleCorrectNote();
          matchTimer.current = 0;
        }
      } else {
        matchTimer.current = 0;
        const now = Date.now();
        if (wrongTimer.current === 0) wrongTimer.current = now;
        if (now - wrongTimer.current > MATCH_THRESHOLD_MS) {
          hasMistakeForCurrent.current = true;
          wrongTimer.current = 0;
        }
      }
    } else {
      matchTimer.current = 0;
      wrongTimer.current = 0;
    }
  };
};
