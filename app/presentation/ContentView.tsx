import React from 'react';

import type { AppContentRoute } from '@sightplay/app-shell';
import { useGuidance } from '@sightplay/guidance';
import { usePractice } from '@sightplay/practice';

import { CourseOverview } from '../../features/curriculum/CourseOverview';
import { CoursePractice } from '../../features/curriculum/CoursePractice';
import { SongLibrary } from '../../features/library/SongLibrary';
import { translations } from '../../i18n';

import { RandomPracticeView } from './RandomPracticeView';
import { SongPracticeSection } from './SongPracticeSection';

type ContentViewProps = {
  route: AppContentRoute;
  navigate: (route: AppContentRoute, replace?: boolean) => void;
  dismissEntry: (fallbackRoute: AppContentRoute) => void;
  t: typeof translations.en;
  toggleLang: () => void;
};

export const ContentView: React.FC<ContentViewProps> = (props) => {
  const { route, navigate, t, ...rest } = props;
  const practice = usePractice();
  const guidance = useGuidance();

  const exitSong = () => {
    props.dismissEntry({ kind: 'library' });
  };

  const exitLesson = () => {
    props.dismissEntry({ kind: 'course' });
  };

  if (route.kind === 'course') {
    return (
      <CourseOverview
        onLessonSelect={(lessonId) => navigate({ kind: 'lessonPractice', lessonId })}
      />
    );
  }

  if (route.kind === 'lessonPractice') {
    return <CoursePractice lessonId={route.lessonId} onExit={exitLesson} />;
  }

  if (route.kind === 'library') {
    return (
      <SongLibrary
        difficulty={route.difficulty}
        onDifficultyChange={(difficulty) => navigate({ kind: 'library', difficulty })}
        onSongSelect={(songId) => navigate({ kind: 'songPractice', songId })}
      />
    );
  }

  if (route.kind === 'songPractice') {
    return (
      <SongPracticeSection
        songId={route.songId}
        recommendations={guidance.view.recommendations}
        t={t}
        onExit={exitSong}
        onRetry={practice.restartExercise}
        onBackToLibrary={exitSong}
        onApplyRec={guidance.applyRecommendation}
        onDismissRec={guidance.dismissRecommendation}
      />
    );
  }

  return <RandomPracticeView t={t} toggleLang={rest.toggleLang} />;
};
