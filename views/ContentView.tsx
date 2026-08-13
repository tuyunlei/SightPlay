import React from 'react';

import type { AppContentRoute } from '@sightplay/app-shell';
import { type PracticeClient, usePractice } from '@sightplay/practice';

import { createSongExercise } from '../app/practice/createExercisePlan';
import { applyRecommendationAction } from '../app/recommendations/applyRecommendationAction';
import type { Recommendation } from '../domain/recommendations';
import { SongLibrary } from '../features/library/SongLibrary';
import { useRecommendations } from '../hooks/useRecommendations';
import { Language, translations } from '../i18n';
import { ChatMessage, ClefType } from '../types';

import { RandomPracticeView } from './RandomPracticeView';
import { SongPracticeSection } from './SongPracticeSection';

type ContentViewProps = {
  route: AppContentRoute;
  navigate: (route: AppContentRoute, replace?: boolean) => void;
  dismissEntry: (fallbackRoute: AppContentRoute) => void;
  t: typeof translations.en;
  toggleLang: () => void;
  chatInput: string;
  setChatInput: (input: string) => void;
  chatHistory: ChatMessage[];
  isLoadingAi: boolean;
  sendMessage: (message: string) => void;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
  lang: Language;
};

const useContentRecommendations = (
  practice: PracticeClient,
  navigate: ContentViewProps['navigate']
) => {
  const recs = useRecommendations(practice.view);

  const applyRec = (rec: Recommendation) => {
    if (!rec.action) return;
    applyRecommendationAction(rec.action, {
      selectClef: (clef) => practice.selectClef(clef === ClefType.TREBLE ? 'treble' : 'bass'),
      setPracticeRange: practice.selectPracticeRange,
      navigate,
    });
    recs.dismiss();
  };

  return { ...recs, applyRec };
};

export const ContentView: React.FC<ContentViewProps> = (props) => {
  const { route, navigate, lang, t, ...rest } = props;
  const practice = usePractice();
  const { recommendations, dismiss, applyRec } = useContentRecommendations(practice, navigate);

  const exitSong = () => {
    props.dismissEntry({ kind: 'library' });
  };

  const retrySong = () => {
    if (route.kind !== 'songPractice') return;
    const plan = createSongExercise(route.songId);
    if (plan) practice.startExercise(plan);
  };

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
        recommendations={recommendations}
        t={t}
        onExit={exitSong}
        onRetry={retrySong}
        onBackToLibrary={exitSong}
        onApplyRec={applyRec}
        onDismissRec={dismiss}
      />
    );
  }

  return (
    <RandomPracticeView
      t={t}
      toggleLang={rest.toggleLang}
      chatInput={rest.chatInput}
      setChatInput={rest.setChatInput}
      chatHistory={rest.chatHistory}
      isLoadingAi={rest.isLoadingAi}
      sendMessage={rest.sendMessage}
      chatEndRef={rest.chatEndRef}
      lang={lang}
      navigate={navigate}
    />
  );
};
