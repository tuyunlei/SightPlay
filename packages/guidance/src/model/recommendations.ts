import type { GuidanceRecommendation, PracticeGuidanceObservation } from './types';

const MIN_ATTEMPTS = 20;

export function recommend(
  observation: PracticeGuidanceObservation
): readonly GuidanceRecommendation[] {
  if (observation.kind === 'exerciseCompleted' && observation.source === 'song') {
    return songRecommendations(observation.difficulty);
  }
  if (
    observation.kind !== 'attemptAccepted' ||
    observation.source !== 'random' ||
    observation.totalAttempts < MIN_ATTEMPTS
  ) {
    return [];
  }
  const accuracy = Math.round((observation.cleanHits / observation.totalAttempts) * 100);
  return randomRecommendations(accuracy, observation).slice(0, 2);
}

function songRecommendations(
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
): readonly GuidanceRecommendation[] {
  const next: 'intermediate' | 'advanced' | null =
    difficulty === 'beginner' ? 'intermediate' : difficulty === 'intermediate' ? 'advanced' : null;
  return [
    ...(next
      ? [
          {
            id: `song-next-${next}`,
            type: 'song' as const,
            content: { kind: 'tryHarderSong' as const, difficulty: next },
            action: { kind: 'navigateDifficulty' as const, difficulty: next },
          },
        ]
      : []),
    {
      id: 'general-keep-going',
      type: 'general',
      content: { kind: 'keepPracticing' },
    },
  ];
}

function randomRecommendations(
  accuracy: number,
  observation: Extract<PracticeGuidanceObservation, { kind: 'attemptAccepted' }>
): GuidanceRecommendation[] {
  if (accuracy > 90) {
    return [
      ...(observation.clef === 'treble'
        ? [
            {
              id: 'clef-try-bass',
              type: 'clef' as const,
              content: { kind: 'tryBass' as const },
              action: { kind: 'selectClef' as const, clef: 'bass' as const },
            },
          ]
        : []),
      ...(observation.range === 'central'
        ? [
            {
              id: 'range-expand',
              type: 'practiceRange' as const,
              content: { kind: 'expandRange' as const },
              action: {
                kind: 'selectPracticeRange' as const,
                range: 'combined' as const,
              },
            },
          ]
        : []),
      {
        id: 'song-suggestion',
        type: 'song',
        content: { kind: 'trySong' },
        action: { kind: 'navigateDifficulty', difficulty: 'intermediate' },
      },
    ];
  }
  if (accuracy < 50) {
    return [
      ...(observation.range !== 'central'
        ? [
            {
              id: 'range-narrow',
              type: 'practiceRange' as const,
              content: { kind: 'narrowRange' as const },
              action: { kind: 'selectPracticeRange' as const, range: 'central' as const },
            },
          ]
        : []),
      {
        id: 'general-slow-down',
        type: 'general',
        content: { kind: 'slowDown' },
      },
    ];
  }
  return [];
}
