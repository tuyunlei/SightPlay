import { ArrowRight, BookOpen, CheckCircle2, Clock3, LockKeyhole, Music2 } from 'lucide-react';
import React from 'react';

import {
  CURRICULUM_LESSONS,
  CURRICULUM_MODULES,
  isPlayableCurriculumLessonId,
  PLAYABLE_CURRICULUM_LESSONS,
  type CurriculumLessonSummary,
  type CurriculumModule,
  type PlayableCurriculumLessonId,
} from '@sightplay/practice';

import { useLanguage } from '../../app/presentation/useLanguage';
import type { translations } from '../../i18n';

import {
  curriculumCapabilityCopy,
  curriculumChapterCopy,
  curriculumLessonCopy,
  curriculumModuleCopy,
} from './curriculumCopy';

type Translation = typeof translations.en;

const LessonCard: React.FC<{
  lesson: CurriculumLessonSummary;
  sequence: string;
  t: Translation;
  onSelect: (lessonId: PlayableCurriculumLessonId) => void;
}> = ({ lesson, sequence, t, onSelect }) => {
  const copy = curriculumLessonCopy(t, lesson.id);
  const playableLessonId = isPlayableCurriculumLessonId(lesson.id) ? lesson.id : null;
  const capabilities = (lesson.requires ?? [])
    .map((capability) => curriculumCapabilityCopy(t, capability))
    .join(', ');

  return (
    <article
      className={`rounded-xl border p-4 ${
        playableLessonId
          ? 'border-indigo-100 bg-indigo-50/40 dark:border-indigo-900/60 dark:bg-indigo-950/20'
          : 'border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-950/40'
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
            playableLessonId
              ? 'text-emerald-700 dark:text-emerald-300'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          {playableLessonId ? <CheckCircle2 size={14} /> : <Clock3 size={14} />}
          {playableLessonId ? t.courseAvailable : t.coursePlanned}
        </span>
        <span className="text-xs text-slate-400">{sequence}</span>
      </div>
      <h4 className="font-semibold text-slate-900 dark:text-slate-100">{copy.title}</h4>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{copy.description}</p>
      {playableLessonId ? (
        <button
          onClick={() => onSelect(playableLessonId)}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-600"
        >
          {t.courseStart}
          <ArrowRight size={16} />
        </button>
      ) : (
        <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
          <LockKeyhole className="mt-0.5 shrink-0" size={14} />
          {t.coursePlannedReason.replace('{capabilities}', capabilities)}
        </p>
      )}
    </article>
  );
};

const ModuleSection: React.FC<{
  module: CurriculumModule;
  t: Translation;
  onSelect: (lessonId: PlayableCurriculumLessonId) => void;
}> = ({ module, t, onSelect }) => {
  const copy = curriculumModuleCopy(t, module.id);
  const lessons = module.chapters.flatMap((chapter) => chapter.lessons);
  const availableCount = lessons.filter((lesson) => lesson.status === 'available').length;

  return (
    <details
      open={module.order <= 2}
      className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"
    >
      <summary className="flex cursor-pointer list-none items-start gap-4 p-5 marker:hidden">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-100 font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
          {module.order}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{copy.title}</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{copy.description}</p>
        </div>
        <span className="mt-1 shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {availableCount}/{lessons.length}
        </span>
      </summary>

      <div className="border-t border-slate-100 px-5 pb-5 dark:border-slate-800">
        {module.chapters.map((chapter) => (
          <section key={chapter.id} className="pt-5">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <Music2 size={15} />
              {curriculumChapterCopy(t, chapter.id)}
            </h3>
            <div className="grid gap-3 md:grid-cols-2">
              {chapter.lessons.map((lesson) => (
                <LessonCard
                  key={lesson.id}
                  lesson={lesson}
                  sequence={`${module.order}.${chapter.order}.${lesson.order}`}
                  t={t}
                  onSelect={onSelect}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </details>
  );
};

export const CourseOverview: React.FC<{
  onLessonSelect: (lessonId: PlayableCurriculumLessonId) => void;
}> = ({ onLessonSelect }) => {
  const { t } = useLanguage();
  const summary = t.courseRoadmapSummary
    .replace('{available}', String(PLAYABLE_CURRICULUM_LESSONS.length))
    .replace('{total}', String(CURRICULUM_LESSONS.length));

  return (
    <main className="relative z-10 mx-auto w-full max-w-5xl p-4 sm:p-6">
      <div className="mb-8 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 dark:border-blue-900/60 dark:from-slate-900 dark:to-indigo-950/40">
        <div className="mb-3 flex items-center gap-3">
          <span className="rounded-xl bg-blue-500 p-2 text-white">
            <BookOpen size={24} />
          </span>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">{t.courseTitle}</h1>
        </div>
        <p className="max-w-3xl text-slate-600 dark:text-slate-300">{t.courseDescription}</p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-sm font-medium text-indigo-700 dark:bg-slate-900/70 dark:text-indigo-300">
          <CheckCircle2 size={16} />
          {summary}
        </div>
      </div>

      <div className="space-y-5">
        {CURRICULUM_MODULES.map((module) => (
          <ModuleSection key={module.id} module={module} t={t} onSelect={onLessonSelect} />
        ))}
      </div>
    </main>
  );
};
