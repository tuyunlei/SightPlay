import type { PracticeGuidanceObservation } from '@sightplay/guidance';
import type { PracticeOutput } from '@sightplay/practice';

export function mapPracticeOutput(output: PracticeOutput): PracticeGuidanceObservation | null {
  if (output.kind === 'microphoneFailed') return null;
  const plan = output.plan;
  const shared = {
    contextId: `${plan.source}:${plan.metadata.id}:${Number(output.epoch)}`,
    source: plan.source,
    clef: plan.kind === 'generated' ? plan.config.clef : plan.clef,
    range: plan.kind === 'generated' ? plan.config.practiceRange : ('combined' as const),
    totalAttempts: output.stats.totalAttempts,
    cleanHits: output.stats.cleanHits,
    streak: output.streak,
  };
  return output.kind === 'attemptAccepted'
    ? {
        kind: 'attemptAccepted',
        at: output.acceptedAt,
        hadMistake: output.hadMistake,
        ...shared,
      }
    : {
        kind: 'exerciseCompleted',
        at: output.completedAt,
        ...(plan.metadata.difficulty ? { difficulty: plan.metadata.difficulty } : {}),
        ...shared,
      };
}
