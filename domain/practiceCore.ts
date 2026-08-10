import { TIMINGS } from '../config/timings';

import { shouldCompleteChallenge } from './challenge';
import {
  initialPracticeState,
  PracticeAction,
  PracticeEffect,
  PracticeReduction,
  PracticeState,
} from './practiceState';
import { computeScore, updateSessionStats } from './scoring';

export { initialPracticeState } from './practiceState';
export type {
  PracticeAction,
  PracticeEffect,
  PracticeMode,
  PracticeReduction,
  PracticeState,
  PracticeStatus,
} from './practiceState';

const withState = (state: PracticeState): PracticeReduction => ({ state, effects: [] });

type SimpleAction = Exclude<
  PracticeAction,
  | { type: 'sessionStatsReset' }
  | { type: 'challengeLoaded' }
  | { type: 'correctNoteAccepted' }
  | { type: 'exitAnimationElapsed' }
  | { type: 'challengeResetElapsed' }
  | { type: 'practiceModeChanged' }
  | { type: 'songChanged' }
  | { type: 'songProgressChanged' }
  | { type: 'songTotalNotesChanged' }
  | { type: 'songStarted' }
  | { type: 'challengeSequenceChanged' }
  | { type: 'challengeIndexChanged' }
  | { type: 'challengeInfoChanged' }
>;

type ChallengeMetadataAction = Extract<
  PracticeAction,
  { type: 'challengeSequenceChanged' | 'challengeIndexChanged' | 'challengeInfoChanged' }
>;

type SongAction = Extract<
  PracticeAction,
  {
    type:
      | 'practiceModeChanged'
      | 'songChanged'
      | 'songProgressChanged'
      | 'songTotalNotesChanged'
      | 'songStarted';
  }
>;

const reduceSimpleAction = (state: PracticeState, action: SimpleAction): PracticeState => {
  switch (action.type) {
    case 'clefChanged':
      return { ...state, clef: action.clef };
    case 'practiceRangeChanged':
      return { ...state, practiceRange: action.practiceRange };
    case 'handModeChanged':
      return { ...state, handMode: action.handMode };
    case 'listeningChanged':
      return { ...state, isListening: action.isListening };
    case 'midiConnectionChanged':
      return { ...state, isMidiConnected: action.isMidiConnected };
    case 'queueReplaced':
      return { ...state, noteQueue: action.noteQueue };
    case 'exitingNotesReplaced':
      return { ...state, exitingNotes: action.exitingNotes };
    case 'detectedNoteChanged':
      return { ...state, detectedNote: action.detectedNote };
    case 'statusChanged':
      return { ...state, status: action.status };
    case 'scoreChanged':
      return { ...state, score: action.score };
    case 'streakChanged':
      return { ...state, streak: action.streak };
    case 'sessionStatsChanged':
      return { ...state, sessionStats: action.sessionStats };
  }
};

const reduceChallengeMetadata = (
  state: PracticeState,
  action: ChallengeMetadataAction
): PracticeState => {
  switch (action.type) {
    case 'challengeSequenceChanged':
      return { ...state, challengeSequence: action.challengeSequence };
    case 'challengeIndexChanged':
      return { ...state, challengeIndex: action.challengeIndex };
    case 'challengeInfoChanged':
      return { ...state, challengeInfo: action.challengeInfo };
  }
};

const reduceSongAction = (state: PracticeState, action: SongAction): PracticeState => {
  switch (action.type) {
    case 'practiceModeChanged':
      return { ...state, practiceMode: action.practiceMode };
    case 'songChanged':
      return { ...state, currentSongId: action.songId };
    case 'songProgressChanged':
      return { ...state, songProgress: action.songProgress };
    case 'songTotalNotesChanged':
      return { ...state, songTotalNotes: action.songTotalNotes };
    case 'songStarted':
      return { ...state, songStartTime: action.startedAt };
  }
};

const reduceCorrectNote = (
  state: PracticeState,
  action: Extract<PracticeAction, { type: 'correctNoteAccepted' }>
): PracticeReduction => {
  const exitingCount = state.handMode === 'both-hands' ? 2 : 1;
  const newlyExiting = state.noteQueue.slice(0, exitingCount);
  const challengeCompleted =
    state.challengeSequence.length > 0 &&
    shouldCompleteChallenge(state.noteQueue.length, state.challengeSequence.length);
  const effects: PracticeEffect[] = newlyExiting.map((note) => ({
    type: 'scheduleExitCleanup',
    noteId: note.id,
    delayMs: TIMINGS.EXIT_ANIMATION_CLEANUP_MS,
  }));

  if (challengeCompleted) {
    effects.push({
      type: 'completeChallenge',
      delayMs: TIMINGS.CHALLENGE_COMPLETE_DELAY_MS,
      clef: state.clef,
      practiceRange: state.practiceRange,
      handMode: state.handMode,
    });
  }

  return {
    state: {
      ...state,
      exitingNotes: [...state.exitingNotes, ...newlyExiting],
      noteQueue: action.nextQueue,
      score: computeScore(state.score, state.streak),
      streak: state.streak + 1,
      sessionStats: updateSessionStats({
        prev: state.sessionStats,
        hasMistake: action.hadMistake,
        timeDiffMs: action.acceptedAt - action.previousHitAt,
      }),
      challengeIndex:
        state.challengeSequence.length > 0 ? action.nextChallengeIndex : state.challengeIndex,
    },
    effects,
  };
};

export const reducePractice = (state: PracticeState, action: PracticeAction): PracticeReduction => {
  if (action.type === 'sessionStatsReset') {
    return withState({
      ...state,
      score: 0,
      streak: 0,
      sessionStats: initialPracticeState.sessionStats,
      songProgress: 0,
      songStartTime: null,
    });
  }

  if (action.type === 'challengeLoaded') {
    return withState({
      ...state,
      challengeInfo: action.challenge,
      challengeSequence: action.challengeSequence,
      challengeIndex: 0,
      noteQueue: action.noteQueue,
      score: 0,
      streak: 0,
      sessionStats: initialPracticeState.sessionStats,
      songProgress: 0,
      songStartTime: null,
    });
  }

  if (action.type === 'correctNoteAccepted') return reduceCorrectNote(state, action);

  if (action.type === 'exitAnimationElapsed') {
    return withState({
      ...state,
      exitingNotes: state.exitingNotes.filter((note) => note.id !== action.noteId),
    });
  }

  if (action.type === 'challengeResetElapsed') {
    return withState({
      ...state,
      challengeSequence: [],
      challengeInfo: null,
      challengeIndex: 0,
      noteQueue: action.noteQueue,
    });
  }

  if (
    action.type === 'practiceModeChanged' ||
    action.type === 'songChanged' ||
    action.type === 'songProgressChanged' ||
    action.type === 'songTotalNotesChanged' ||
    action.type === 'songStarted'
  ) {
    return withState(reduceSongAction(state, action));
  }

  if (
    action.type === 'challengeSequenceChanged' ||
    action.type === 'challengeIndexChanged' ||
    action.type === 'challengeInfoChanged'
  ) {
    return withState(reduceChallengeMetadata(state, action));
  }

  return withState(reduceSimpleAction(state, action));
};
