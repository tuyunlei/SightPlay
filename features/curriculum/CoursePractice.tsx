import { RefreshCw } from 'lucide-react';
import React from 'react';

import { isPlayableCurriculumLessonId, usePractice } from '@sightplay/practice';

import { useLanguage } from '../../app/presentation/useLanguage';
import type { translations } from '../../i18n';
import PracticeArea from '../practice/PracticeArea';

import { curriculumLessonCopy, curriculumStageCopy } from './curriculumCopy';

function accuracy(total: number, clean: number): number {
  return total === 0 ? 0 : Math.round((clean / total) * 100);
}

type CourseCompletionProps = {
  t: typeof translations.en;
  lessonTitle: string;
  overallAccuracy: number;
  transferAccuracy: number;
  onNewVariation: () => void;
  onExit: () => void;
};

const CourseCompletion: React.FC<CourseCompletionProps> = ({
  t,
  lessonTitle,
  overallAccuracy,
  transferAccuracy,
  onNewVariation,
  onExit,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-bg-overlay)] p-4">
    <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 text-center dark:border-slate-700 dark:bg-slate-900">
      <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
        {t.courseCompleteTitle}
      </h2>
      <p className="mt-2 text-slate-600 dark:text-slate-300">{lessonTitle}</p>
      <div className="my-6 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
          <div className="text-sm text-slate-500 dark:text-slate-400">{t.accuracy}</div>
          <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            {overallAccuracy}%
          </div>
        </div>
        <div className="rounded-xl bg-indigo-50 p-4 dark:bg-indigo-950/50">
          <div className="text-sm text-indigo-600 dark:text-indigo-300">
            {t.courseTransferAccuracy}
          </div>
          <div className="text-3xl font-bold text-indigo-700 dark:text-indigo-200">
            {transferAccuracy}%
          </div>
        </div>
      </div>
      <p className="mb-6 text-sm text-slate-600 dark:text-slate-300">
        {t.courseTransferExplanation}
      </p>
      <div className="flex gap-3">
        <button
          onClick={onNewVariation}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-500 px-4 py-3 font-medium text-white hover:bg-blue-600"
        >
          <RefreshCw size={17} />
          {t.courseNewVariation}
        </button>
        <button
          onClick={onExit}
          className="flex-1 rounded-xl bg-slate-100 px-4 py-3 font-medium text-slate-800 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
        >
          {t.backToCourse}
        </button>
      </div>
    </section>
  </div>
);

export const CoursePractice: React.FC<{
  lessonId: string;
  onExit: () => void;
}> = ({ lessonId, onExit }) => {
  const { t } = useLanguage();
  const practice = usePractice();

  if (!isPlayableCurriculumLessonId(lessonId)) {
    return (
      <main className="relative z-10 mx-auto max-w-xl p-8 text-center">
        <p className="text-red-500 dark:text-red-400">{t.courseLessonNotFound}</p>
        <button onClick={onExit} className="mt-4 rounded-lg bg-blue-500 px-4 py-2 text-white">
          {t.backToCourse}
        </button>
      </main>
    );
  }

  const loaded =
    practice.view.source === 'lesson' && practice.view.metadata.curriculum?.lessonId === lessonId;
  if (!loaded) {
    return <div className="relative z-10 p-12 text-center text-slate-500">{t.courseLoading}</div>;
  }

  const lesson = curriculumLessonCopy(t, lessonId);
  const stage = curriculumStageCopy(t, practice.view.currentRole);
  const transfer = practice.view.roleStats.transfer;
  const transferAccuracy = accuracy(transfer.totalAttempts, transfer.cleanHits);
  const completed = practice.view.completion.kind === 'completed';

  return (
    <main className="relative z-10">
      <header className="mb-4 border-b border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <div className="mx-auto flex max-w-4xl items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-300">
              {stage.title}
            </p>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {lesson.title}
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{stage.description}</p>
          </div>
          <button
            onClick={onExit}
            className="rounded-lg bg-slate-100 px-4 py-2 font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
          >
            {t.exitLesson}
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl p-3 sm:p-4">
        <PracticeArea
          view={practice.view}
          t={t}
          onPracticeRangeChange={practice.selectPracticeRange}
          onHandModeChange={practice.selectHandMode}
        />
      </div>

      {completed && (
        <CourseCompletion
          t={t}
          lessonTitle={lesson.title}
          overallAccuracy={practice.view.accuracy}
          transferAccuracy={transferAccuracy}
          onNewVariation={() => practice.startLesson(lessonId)}
          onExit={onExit}
        />
      )}
    </main>
  );
};
