import { describe, expect, it, vi } from 'vitest';

import { createGuidanceRuntime, type GuidancePorts } from '@sightplay/guidance';
import { createPracticeRuntime, type PracticePorts } from '@sightplay/practice';

import { createInitialRandomExercise } from '../practice/createExercisePlan';

import { applyGuidanceOutput } from './applyGuidanceOutput';

function practicePorts(): PracticePorts {
  return {
    clock: { now: () => 100 },
    scheduler: { schedule: () => () => undefined },
    seed: { nextSeed: () => 42 },
    midi: { start: vi.fn(async () => undefined), dispose: vi.fn() },
    microphone: {
      start: vi.fn(async () => undefined),
      stop: vi.fn(),
      dispose: vi.fn(),
    },
  };
}

function guidancePorts(): GuidancePorts {
  return {
    clock: { now: () => 100 },
    scheduler: { schedule: () => () => undefined },
    chat: {
      request: vi.fn(async () => ({
        ok: true as const,
        reply: {
          replyText: 'Try this exercise.',
          challengeData: {
            title: 'Stepwise reading',
            description: 'Read three neighboring notes.',
            notes: ['C4', 'D4', 'E4'],
          },
        },
      })),
    },
  };
}

describe('Guidance and Practice application composition', () => {
  it('starts a validated coach proposal through the public Practice intent', async () => {
    const practice = createPracticeRuntime(practicePorts(), createInitialRandomExercise(42));
    const guidance = createGuidanceRuntime(guidancePorts(), {
      clef: 'treble',
      language: 'en',
    });
    guidance.onOutput((output) =>
      applyGuidanceOutput(output, {
        currentClef: () => practice.getView().clef,
        startExercise: (plan) => practice.dispatch({ kind: 'startExercise', plan }),
        selectClef: (clef) => practice.dispatch({ kind: 'selectClef', clef }),
        selectPracticeRange: (practiceRange) =>
          practice.dispatch({ kind: 'selectPracticeRange', practiceRange }),
        navigate: vi.fn(),
      })
    );

    practice.start();
    guidance.start();
    guidance.dispatch({ kind: 'sendMessage', text: 'Create an exercise' });

    await vi.waitFor(() =>
      expect(practice.getState().plan).toMatchObject({
        kind: 'finite',
        source: 'coach',
        clef: 'treble',
        metadata: { title: 'Stepwise reading' },
      })
    );
    const coachPlan = practice.getState().plan;
    if (coachPlan.kind !== 'finite') throw new Error('Expected a finite coach exercise');
    expect(coachPlan.frames.map((frame) => Number(frame.pitches[0]))).toEqual([60, 62, 64]);

    guidance.dispose();
    practice.dispose();
  });

  it('preserves exact recommendation targets across the feature boundary', () => {
    const ports = {
      currentClef: vi.fn(() => 'treble' as const),
      startExercise: vi.fn(),
      selectClef: vi.fn(),
      selectPracticeRange: vi.fn(),
      navigate: vi.fn(),
    };

    applyGuidanceOutput(
      { kind: 'recommendationApplied', action: { kind: 'selectClef', clef: 'bass' } },
      ports
    );
    applyGuidanceOutput(
      {
        kind: 'recommendationApplied',
        action: { kind: 'selectPracticeRange', range: 'upper' },
      },
      ports
    );
    applyGuidanceOutput(
      {
        kind: 'recommendationApplied',
        action: { kind: 'navigateDifficulty', difficulty: 'intermediate' },
      },
      ports
    );
    applyGuidanceOutput(
      {
        kind: 'recommendationApplied',
        action: { kind: 'navigateSong', songId: 'ode-to-joy' },
      },
      ports
    );

    expect(ports.selectClef).toHaveBeenCalledWith('bass');
    expect(ports.selectPracticeRange).toHaveBeenCalledWith('upper');
    expect(ports.navigate).toHaveBeenNthCalledWith(1, {
      kind: 'library',
      difficulty: 'intermediate',
    });
    expect(ports.navigate).toHaveBeenNthCalledWith(2, {
      kind: 'songPractice',
      songId: 'ode-to-joy',
    });
  });
});
