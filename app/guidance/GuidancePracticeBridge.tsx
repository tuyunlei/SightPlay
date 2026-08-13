import { useEffect } from 'react';

import type { AppRoute } from '@sightplay/app-shell';
import { useGuidance } from '@sightplay/guidance';
import { usePractice } from '@sightplay/practice';

import { translations } from '../../i18n';

import { applyGuidanceOutput } from './applyGuidanceOutput';
import { mapPracticeOutput } from './mapPracticeOutput';

export function GuidancePracticeBridge({
  language,
  navigate,
  t,
}: {
  readonly language: 'en' | 'zh';
  readonly navigate: (route: AppRoute, replace?: boolean) => void;
  readonly t: typeof translations.en;
}) {
  const practice = usePractice();
  const guidance = useGuidance();
  const currentClef = practice.view.clef;
  const changeContext = guidance.changeContext;
  const observePractice = guidance.observePractice;
  const subscribeGuidanceOutput = guidance.onOutput;
  const subscribePracticeOutput = practice.onOutput;
  const startExercise = practice.startExercise;
  const selectClef = practice.selectClef;
  const selectPracticeRange = practice.selectPracticeRange;

  useEffect(() => {
    changeContext({ clef: currentClef, language });
  }, [changeContext, currentClef, language]);

  useEffect(
    () =>
      subscribePracticeOutput((output) => {
        if (output.kind === 'microphoneFailed') {
          alert(t.micError);
          return;
        }
        const observation = mapPracticeOutput(output);
        if (observation) observePractice(observation);
      }),
    [observePractice, subscribePracticeOutput, t.micError]
  );

  useEffect(
    () =>
      subscribeGuidanceOutput((output) =>
        applyGuidanceOutput(output, {
          currentClef: () => currentClef,
          startExercise,
          selectClef,
          selectPracticeRange,
          navigate,
        })
      ),
    [currentClef, navigate, selectClef, selectPracticeRange, startExercise, subscribeGuidanceOutput]
  );

  return null;
}
