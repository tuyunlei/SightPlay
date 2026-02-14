import { useCallback } from 'react';
import type { MutableRefObject } from 'react';

import { createNoteFromMidi } from '../../../domain/note';
import { usePracticeStore } from '../../../store/practiceStore';
import { Note } from '../../../types';
import type { PracticeActions, PracticeRefs, PressedKeys } from '../slices';

// Helper: check if both hands are correctly pressed
const checkBothHandsCorrect = (
  rightTarget: Note | undefined,
  leftTarget: Note | undefined,
  pressedKeys: PressedKeys
): boolean => {
  if (!rightTarget || !leftTarget) return false;
  const rightPressed = pressedKeys.has(rightTarget.midi);
  const leftPressed = pressedKeys.has(leftTarget.midi);
  if (!rightPressed && !leftPressed) return false;

  const currentPressed = Array.from(pressedKeys.values());
  const rightIsCorrect = currentPressed.some(
    (p) => p.note.midi === rightTarget.midi && p.isCorrect
  );
  const leftIsCorrect = currentPressed.some((p) => p.note.midi === leftTarget.midi && p.isCorrect);
  return rightIsCorrect && leftIsCorrect;
};

export const useMidiNoteHandlers = (
  setDetectedNote: PracticeActions['setDetectedNote'],
  addPressedKey: (
    midiNumber: number,
    note: Note,
    isCorrect: boolean,
    targetId?: string | null
  ) => void,
  removePressedKey: (
    midiNumber: number
  ) => { note: Note; isCorrect: boolean; targetId?: string | null } | null,
  pressedKeysRef: MutableRefObject<PressedKeys>,
  handleCorrectNote: () => void,
  refs: PracticeRefs
) => {
  const { hasMistakeForCurrent, isProcessingRef } = refs;

  const handleMidiNoteOn = useCallback(
    (midiNumber: number) => {
      const note = createNoteFromMidi(midiNumber, -1);
      setDetectedNote(note);

      const state = usePracticeStore.getState();
      const handMode = state.handMode;

      if (handMode === 'both-hands') {
        const rightTarget = state.noteQueue[0];
        const leftTarget = state.noteQueue[1];
        const matchesRight = rightTarget && midiNumber === rightTarget.midi;
        const matchesLeft = leftTarget && midiNumber === leftTarget.midi;
        const isCorrect = matchesRight || matchesLeft;
        const targetId = matchesRight ? rightTarget.id : matchesLeft ? leftTarget.id : null;

        addPressedKey(midiNumber, note, isCorrect, targetId);
        if (!isCorrect) hasMistakeForCurrent.current = true;
      } else {
        const target = state.noteQueue[0];
        const isCorrect = target ? midiNumber === target.midi : false;
        addPressedKey(midiNumber, note, isCorrect, target?.id ?? null);
        if (target && !isCorrect) hasMistakeForCurrent.current = true;
      }
    },
    [addPressedKey, hasMistakeForCurrent, setDetectedNote]
  );

  const handleMidiNoteOff = useCallback(
    (midiNumber: number) => {
      const pressedInfo = removePressedKey(midiNumber);
      const values = Array.from(pressedKeysRef.current.values());
      const lastPressed = values.length > 0 ? values[values.length - 1].note : null;
      setDetectedNote(lastPressed);

      if (pressedInfo?.isCorrect && !isProcessingRef.current) {
        const state = usePracticeStore.getState();
        const handMode = state.handMode;

        if (handMode === 'both-hands') {
          const rightTarget = state.noteQueue[0];
          const leftTarget = state.noteQueue[1];
          if (checkBothHandsCorrect(rightTarget, leftTarget, pressedKeysRef.current)) {
            handleCorrectNote();
          }
        } else {
          const target = state.noteQueue[0];
          const isSameTarget = !pressedInfo.targetId || target?.id === pressedInfo.targetId;
          if (isSameTarget && target && target.midi === midiNumber) {
            handleCorrectNote();
          }
        }
      }
    },
    [handleCorrectNote, isProcessingRef, pressedKeysRef, removePressedKey, setDetectedNote]
  );

  return { handleMidiNoteOn, handleMidiNoteOff };
};
