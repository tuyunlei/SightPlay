import type { CurriculumLessonId, ExerciseFrameRole } from '@sightplay/practice';

import type { translations } from '../../i18n';

type Translation = typeof translations.en;

export function curriculumLessonCopy(t: Translation, lessonId: CurriculumLessonId) {
  switch (lessonId) {
    case 'landmark-steps':
      return { title: t.lessonLandmarkTitle, description: t.lessonLandmarkDescription };
    case 'five-finger-phrases':
      return { title: t.lessonFiveFingerTitle, description: t.lessonFiveFingerDescription };
    case 'familiar-variations':
      return { title: t.lessonVariationTitle, description: t.lessonVariationDescription };
  }
}

export function curriculumStageCopy(t: Translation, role: ExerciseFrameRole | null) {
  switch (role) {
    case 'warmup':
      return { title: t.courseStageWarmup, description: t.courseStageWarmupDescription };
    case 'guided':
      return { title: t.courseStageGuided, description: t.courseStageGuidedDescription };
    case 'familiar':
      return { title: t.courseStageFamiliar, description: t.courseStageFamiliarDescription };
    case 'transfer':
      return { title: t.courseStageTransfer, description: t.courseStageTransferDescription };
    default:
      return { title: t.courseLoading, description: '' };
  }
}
