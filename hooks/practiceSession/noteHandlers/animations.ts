import { TIMINGS } from '../../../config/timings';
import { usePracticeStore } from '../../../store/practiceStore';
import { Note } from '../../../types';
import type { PracticeActions, PracticeRefs } from '../slices';

export const lockProcessing = (isProcessingRef: PracticeRefs['isProcessingRef']) => {
  isProcessingRef.current = true;
  setTimeout(() => {
    isProcessingRef.current = false;
  }, TIMINGS.PROCESSING_LOCKOUT_MS);
};

export const enqueueExitAnimation = (
  currentNote: Note,
  exitingNotes: Note[],
  setExitingNotes: PracticeActions['setExitingNotes']
) => {
  setExitingNotes([...exitingNotes, currentNote]);
  setTimeout(() => {
    const latest = usePracticeStore.getState().exitingNotes;
    setExitingNotes(latest.filter((note) => note.id !== currentNote.id));
  }, TIMINGS.EXIT_ANIMATION_CLEANUP_MS);
};
