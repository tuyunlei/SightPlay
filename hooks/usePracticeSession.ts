import { computeAccuracy } from '../domain/scoring';

import {
  useQueueInitialization,
  useToggleMic,
  useToggleClef,
  useResetSessionStats,
  useLoadChallenge,
  useMicInput,
} from './practiceSession/actions';
import {
  useDetectedNoteUpdater,
  useHandleCorrectNote,
  useMicNoteHandler,
  useMidiNoteHandlers,
} from './practiceSession/noteHandlers';
import {
  usePracticeStateSlice,
  usePracticeActionsSlice,
  usePracticeRefs,
  usePressedKeysState,
} from './practiceSession/slices';
import type { UsePracticeSessionOptions } from './practiceSession/slices';
import { useMidiInput } from './useMidiInput';

export type { UsePracticeSessionOptions };

const useNoteHandlers = (
  actions: ReturnType<typeof usePracticeActionsSlice>,
  refs: ReturnType<typeof usePracticeRefs>,
  pressedKeysState: ReturnType<typeof usePressedKeysState>,
  onChallengeComplete?: () => void,
  runtime?: UsePracticeSessionOptions['runtime']
) => {
  const updateDetectedNote = useDetectedNoteUpdater(actions.setDetectedNote);
  const handleCorrectNote = useHandleCorrectNote(actions, refs, onChallengeComplete, runtime);
  const handleMicNote = useMicNoteHandler(updateDetectedNote, handleCorrectNote, refs);
  const { handleMidiNoteOn, handleMidiNoteOff } = useMidiNoteHandlers(
    actions.setDetectedNote,
    pressedKeysState.addPressedKey,
    pressedKeysState.removePressedKey,
    pressedKeysState.pressedKeysRef,
    handleCorrectNote,
    refs
  );
  return { handleMicNote, handleMidiNoteOn, handleMidiNoteOff };
};

export const usePracticeSession = ({
  onMicError,
  onChallengeComplete,
  runtime,
  audioInputDependencies,
  createMidiService,
}: UsePracticeSessionOptions) => {
  const state = usePracticeStateSlice();
  const actions = usePracticeActionsSlice();
  const refs = usePracticeRefs();
  const pressedKeysState = usePressedKeysState();

  const targetNote = state.noteQueue.length > 0 ? state.noteQueue[0] : null;
  const accuracy = computeAccuracy(state.sessionStats);

  useQueueInitialization({
    clef: state.clef,
    practiceRange: state.practiceRange,
    handMode: state.handMode,
    challengeSequenceLength: state.challengeSequence.length,
    setNoteQueue: actions.setNoteQueue,
    lastHitTime: refs.lastHitTime,
  });

  const { handleMicNote, handleMidiNoteOn, handleMidiNoteOff } = useNoteHandlers(
    actions,
    refs,
    pressedKeysState,
    onChallengeComplete,
    runtime
  );

  useMidiInput({
    onNoteOn: handleMidiNoteOn,
    onNoteOff: handleMidiNoteOff,
    onConnectionChange: actions.setIsMidiConnected,
    createService: createMidiService,
  });

  const { start: startMic, stop: stopMic } = useMicInput(
    handleMicNote,
    actions.setIsListening,
    actions.setStatus,
    actions.setDetectedNote,
    onMicError,
    audioInputDependencies
  );

  const toggleMic = useToggleMic(state.isListening, startMic, stopMic);
  const toggleClef = useToggleClef(state.clef, actions.setClef);
  const resetSessionStats = useResetSessionStats(actions.resetStats, refs.lastHitTime);
  const loadChallenge = useLoadChallenge(actions.dispatch, refs.lastHitTime, runtime?.now);

  const sessionActions = {
    toggleMic,
    toggleClef,
    selectClef: actions.setClef,
    resetSessionStats,
    loadChallenge,
    setPracticeRange: actions.setPracticeRange,
    setHandMode: actions.setHandMode,
    setDetectedNote: actions.setDetectedNote,
    setIsListening: actions.setIsListening,
    setStatus: actions.setStatus,
    setNoteQueue: actions.setNoteQueue,
  };

  const result = {
    state,
    derived: { targetNote, accuracy },
    actions: sessionActions,
    pressedKeys: pressedKeysState.pressedKeys,
  };

  if (import.meta.env.MODE === 'test' || import.meta.env.DEV) {
    return {
      ...result,
      __testHandlers: {
        handleMidiNoteOn,
        handleMidiNoteOff,
        isReadyForInput: () => !refs.isProcessingRef.current,
      },
    };
  }

  return result;
};
