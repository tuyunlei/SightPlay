import React, { useEffect, useState } from 'react';

import type { AppContentRoute } from '@sightplay/app-shell';

import { applyRecommendationAction } from '../app/recommendations/applyRecommendationAction';
import { getSongById } from '../data/songs';
import type { Recommendation } from '../domain/recommendations';
import { SongLibrary } from '../features/library/SongLibrary';
import { usePracticeSession } from '../hooks/usePracticeSession';
import { useRecommendations } from '../hooks/useRecommendations';
import { Language, translations } from '../i18n';
import { ChatMessage } from '../types';

import { RandomPracticeView } from './RandomPracticeView';
import { SongPracticeSection } from './SongPracticeSection';

type ContentViewProps = {
  route: AppContentRoute;
  navigate: (route: AppContentRoute, replace?: boolean) => void;
  state: ReturnType<typeof usePracticeSession>['state'];
  derived: ReturnType<typeof usePracticeSession>['derived'];
  actions: ReturnType<typeof usePracticeSession>['actions'];
  pressedKeys: ReturnType<typeof usePracticeSession>['pressedKeys'];
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
  actions: ContentViewProps['actions'],
  navigate: ContentViewProps['navigate']
) => {
  const recs = useRecommendations();

  const applyRec = (rec: Recommendation) => {
    if (!rec.action) return;
    applyRecommendationAction(rec.action, {
      selectClef: actions.selectClef,
      setPracticeRange: actions.setPracticeRange,
      navigate,
    });
    recs.dismiss();
  };

  return { ...recs, applyRec };
};

export const ContentView: React.FC<ContentViewProps> = (props) => {
  const { route, navigate, actions, lang, t, ...rest } = props;
  const [completedSongId, setCompletedSongId] = useState<string | null>(null);
  const { recommendations, onSongComplete, dismiss, applyRec } = useContentRecommendations(
    actions,
    navigate
  );
  const activeSongId = route.kind === 'songPractice' ? route.songId : null;

  useEffect(() => {
    if (completedSongId !== null && completedSongId !== activeSongId) {
      setCompletedSongId(null);
    }
  }, [activeSongId, completedSongId]);

  const exitSong = () => {
    setCompletedSongId(null);
    navigate({ kind: 'library' });
  };

  const completeSong = () => {
    if (route.kind !== 'songPractice') return;
    setCompletedSongId(route.songId);
    const song = getSongById(route.songId);
    if (song) onSongComplete(song.difficulty);
  };

  const backToLib = () => {
    exitSong();
  };

  const retrySong = () => {
    setCompletedSongId(null);
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
        showComplete={completedSongId === route.songId}
        recommendations={recommendations}
        t={t}
        onExit={exitSong}
        onComplete={completeSong}
        onRetry={retrySong}
        onBackToLibrary={backToLib}
        onApplyRec={applyRec}
        onDismissRec={dismiss}
      />
    );
  }

  return (
    <RandomPracticeView
      state={rest.state}
      derived={rest.derived}
      actions={actions}
      pressedKeys={rest.pressedKeys}
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
