import type {
  CurriculumCapability,
  CurriculumChapterId,
  CurriculumLessonId,
  CurriculumModuleId,
  ExerciseFrameRole,
} from '@sightplay/practice';

import type { translations } from '../../i18n';

type Translation = typeof translations.en;

export function curriculumLessonCopy(t: Translation, lessonId: CurriculumLessonId) {
  return t.curriculumLessons[lessonId];
}

export function curriculumModuleCopy(t: Translation, moduleId: CurriculumModuleId) {
  return t.curriculumModules[moduleId];
}

export function curriculumChapterCopy(t: Translation, chapterId: CurriculumChapterId) {
  return t.curriculumChapters[chapterId];
}

export function curriculumCapabilityCopy(t: Translation, capability: CurriculumCapability) {
  return t.curriculumCapabilities[capability];
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
