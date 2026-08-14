import { useEffect, useMemo } from 'react';

import type { AppContentRoute, ProtectedAppRoute } from '@sightplay/app-shell';
import type { PracticeClient } from '@sightplay/practice';

import { createSongExercise, DEFAULT_RANDOM_CONFIG } from './createExercisePlan';

export function contentRouteOf(route: ProtectedAppRoute): AppContentRoute {
  return route.kind === 'passkeys' ? (route.returnTo ?? { kind: 'randomPractice' }) : route;
}

export function usePracticeRoute(route: ProtectedAppRoute, practice: PracticeClient): void {
  const contentRoute = contentRouteOf(route);
  const songId = contentRoute.kind === 'songPractice' ? contentRoute.songId : null;
  const songPlan = useMemo(() => (songId ? createSongExercise(songId) : null), [songId]);
  const source = practice.view.source;
  const exerciseId = practice.view.metadata.id;
  const startExercise = practice.startExercise;
  const startRandom = practice.startRandom;

  useEffect(() => {
    if (contentRoute.kind === 'songPractice' && songPlan) {
      if (source !== 'song' || exerciseId !== songPlan.metadata.id) {
        startExercise(songPlan);
      }
      return;
    }
    if (contentRoute.kind === 'randomPractice' && source === 'song') {
      startRandom(DEFAULT_RANDOM_CONFIG);
    }
  }, [contentRoute.kind, exerciseId, songPlan, source, startExercise, startRandom]);
}
