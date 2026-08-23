import { ArrowRight, BookOpen, Music2 } from 'lucide-react';
import React from 'react';

import { CURRICULUM_LESSONS, type CurriculumLessonId } from '@sightplay/practice';

import { useLanguage } from '../../app/presentation/useLanguage';

import { curriculumLessonCopy } from './curriculumCopy';

export const CourseOverview: React.FC<{
  onLessonSelect: (lessonId: CurriculumLessonId) => void;
}> = ({ onLessonSelect }) => {
  const { t } = useLanguage();

  return (
    <main className="relative z-10 mx-auto w-full max-w-4xl p-4 sm:p-6">
      <div className="mb-8 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 dark:border-blue-900/60 dark:from-slate-900 dark:to-indigo-950/40">
        <div className="mb-3 flex items-center gap-3">
          <span className="rounded-xl bg-blue-500 p-2 text-white">
            <BookOpen size={24} />
          </span>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">{t.courseTitle}</h1>
        </div>
        <p className="max-w-2xl text-slate-600 dark:text-slate-300">{t.courseDescription}</p>
      </div>

      <div className="space-y-4">
        {CURRICULUM_LESSONS.map((lesson) => {
          const copy = curriculumLessonCopy(t, lesson.id);
          return (
            <article
              key={lesson.id}
              className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:flex-row sm:items-center"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                {lesson.order}
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
                  <Music2 size={14} />
                  {`${t.courseLesson} ${lesson.order}`}
                </div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  {copy.title}
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  {copy.description}
                </p>
              </div>
              <button
                onClick={() => onLessonSelect(lesson.id)}
                className="flex items-center justify-center gap-2 rounded-xl bg-blue-500 px-5 py-3 font-medium text-white transition-colors hover:bg-blue-600"
              >
                {t.courseStart}
                <ArrowRight size={18} />
              </button>
            </article>
          );
        })}
      </div>
    </main>
  );
};
