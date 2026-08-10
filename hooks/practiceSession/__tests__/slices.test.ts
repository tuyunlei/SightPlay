import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { createNoteFromMidi } from '../../../domain/note';
import { initialPracticeState } from '../../../domain/practiceCore';
import { usePracticeStore } from '../../../store/practiceStore';
import { ClefType } from '../../../types';
import { usePracticeActionsSlice, usePracticeStateSlice, usePressedKeysState } from '../slices';

describe('practice React adapters', () => {
  beforeEach(() => {
    usePracticeStore.setState(initialPracticeState);
  });

  it('updates the selected React state after a typed store action', () => {
    const { result: actions } = renderHook(() => usePracticeActionsSlice());
    const { result: state } = renderHook(() => usePracticeStateSlice());

    act(() => actions.current.setClef(ClefType.BASS));

    expect(state.current.clef).toBe(ClefType.BASS);
  });

  it('tracks the pressed-key lifecycle and returns the released target identity', () => {
    const target = createNoteFromMidi(60, 0);
    const { result } = renderHook(() => usePressedKeysState());

    act(() => result.current.addPressedKey(60, target, true, target.id));
    expect(result.current.pressedKeys.get(60)).toEqual({
      note: target,
      isCorrect: true,
      targetId: target.id,
    });

    let released: ReturnType<typeof result.current.removePressedKey> = null;
    act(() => {
      released = result.current.removePressedKey(60);
    });
    expect(released).toEqual({ note: target, isCorrect: true, targetId: target.id });
    expect(result.current.pressedKeys.size).toBe(0);
  });
});
