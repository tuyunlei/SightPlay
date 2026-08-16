import { createNoteFromMidi } from '@sightplay/music-domain';

import { frameAt } from './exercise';
import { computeAccuracy } from './scoring';
import type {
  Clef,
  ExerciseMetadata,
  HandMode,
  MidiPitch,
  NoteDuration,
  NoteName,
  PracticeRange,
  PracticeState,
  PracticeStatus,
  ScoreFrame,
  SessionStats,
} from './types';

const VISIBLE_FRAME_COUNT = 20;
export interface PracticeNoteView {
  readonly id: string;
  readonly name: NoteName;
  readonly octave: number;
  readonly frequency: number;
  readonly midi: number;
  readonly globalIndex: number;
  readonly duration?: NoteDuration;
}

export interface PressedPitchView {
  readonly midi: number;
  readonly note: PracticeNoteView;
  readonly isCorrect: boolean;
  readonly targetId: string | null;
}

export interface PracticeView {
  readonly source: 'random' | 'song' | 'coach';
  readonly metadata: ExerciseMetadata;
  readonly clef: Clef;
  readonly practiceRange: PracticeRange;
  readonly handMode: HandMode;
  readonly noteQueue: readonly PracticeNoteView[];
  readonly exitingNotes: readonly PracticeNoteView[];
  readonly detectedNote: PracticeNoteView | null;
  readonly targetNote: PracticeNoteView | null;
  readonly pressedKeys: readonly PressedPitchView[];
  readonly status: PracticeStatus;
  readonly score: number;
  readonly streak: number;
  readonly sessionStats: SessionStats;
  readonly accuracy: number;
  readonly isListening: boolean;
  readonly isMidiConnected: boolean;
  readonly progress: number;
  readonly completedCount: number;
  readonly totalCount: number | null;
  readonly completion: PracticeState['completion'];
  readonly startedAt: number;
  readonly elapsedMs: number;
}

export function selectPracticeView(state: PracticeState): PracticeView {
  const frames = visibleFrames(state);
  const notes = frames.flatMap(frameToNotes);
  const targetFrame = frameAt(state.plan, state.cursor);
  const targetNotes = targetFrame ? frameToNotes(targetFrame) : [];
  const totalCount = state.plan.kind === 'finite' ? state.plan.frames.length : null;
  return {
    source: state.plan.source,
    metadata: state.plan.metadata,
    clef: state.plan.kind === 'generated' ? state.plan.config.clef : state.plan.clef,
    practiceRange: state.plan.kind === 'generated' ? state.plan.config.practiceRange : 'combined',
    handMode: state.plan.kind === 'generated' ? state.plan.config.handMode : state.plan.handMode,
    noteQueue: notes,
    exitingNotes: state.exitingFrames.flatMap(frameToNotes),
    detectedNote:
      state.detectedPitch === null ? null : noteView(state.detectedPitch, 'detected', -1),
    targetNote: targetNotes[0] ?? null,
    pressedKeys: state.heldPitches.map((held) => ({
      midi: held.pitch,
      note: noteView(held.pitch, `pressed:${held.pitch}`, -1),
      isCorrect: held.matchesTarget,
      targetId: targetNotes.find((note) => note.midi === held.pitch)?.id ?? null,
    })),
    status: state.status,
    score: state.score,
    streak: state.streak,
    sessionStats: state.stats,
    accuracy: computeAccuracy(state.stats),
    isListening: state.microphone === 'listening',
    isMidiConnected: state.midiConnected,
    progress: totalCount ? Math.round((state.cursor / totalCount) * 100) : 0,
    completedCount: state.cursor,
    totalCount,
    completion: state.completion,
    startedAt: state.startedAt,
    elapsedMs:
      (state.completion.kind === 'completed'
        ? state.completion.completedAt
        : state.lastAcceptedAt) - state.startedAt,
  };
}

function visibleFrames(state: PracticeState): readonly ScoreFrame[] {
  return Array.from({ length: VISIBLE_FRAME_COUNT }, (_, offset) =>
    frameAt(state.plan, state.cursor + offset)
  ).flatMap((frame) => (frame ? [frame] : []));
}

function frameToNotes(frame: ScoreFrame): PracticeNoteView[] {
  return frame.pitches.map((pitch, lane) =>
    noteView(pitch, `${frame.id}:${lane}`, frame.index, frame.duration)
  );
}

function noteView(
  pitch: MidiPitch,
  id: string,
  globalIndex: number,
  duration?: NoteDuration
): PracticeNoteView {
  const midi = Number(pitch);
  const note = createNoteFromMidi(midi);
  return {
    id,
    ...note,
    globalIndex,
    ...(duration ? { duration } : {}),
  };
}
