import React, { useCallback } from 'react';

import { ViewMode } from '../components/navigation/NavigationTabs';
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
  viewMode: ViewMode;
  selectedSongId: string | null;
  showSongComplete: boolean;
  setSelectedSongId: (id: string | null) => void;
  setViewMode: (mode: ViewMode) => void;
  setShowSongComplete: (show: boolean) => void;
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
  setViewMode: ContentViewProps['setViewMode'],
  setSelectedSongId: ContentViewProps['setSelectedSongId']
) => {
  const recs = useRecommendations();
  const cbs = { toggleClef: actions.toggleClef, setPracticeRange: actions.setPracticeRange };
  const applyRec = (rec: Recommendation) => {
    recs.applyAction(rec, cbs);
    if (rec.action?.kind === 'navigateDifficulty') setViewMode('library');
    if (rec.action?.kind === 'navigateSong') setSelectedSongId(rec.action.songId);
  };
  return { ...recs, applyRec };
};

export const ContentView: React.FC<ContentViewProps> = (props) => {
  const {
    viewMode,
    selectedSongId,
    showSongComplete,
    setSelectedSongId,
    setViewMode,
    setShowSongComplete,
    actions,
    lang,
    t,
    ...rest
  } = props;
  const { recommendations, onSongComplete, dismiss, applyRec } = useContentRecommendations(
    actions,
    setViewMode,
    setSelectedSongId
  );

  const exitSong = useCallback(() => {
    setViewMode('library');
    setSelectedSongId(null);
  }, [setViewMode, setSelectedSongId]);

  const completeSong = useCallback(() => {
    setShowSongComplete(true);
    const song = selectedSongId ? getSongById(selectedSongId) : undefined;
    if (song) onSongComplete(song.difficulty);
  }, [selectedSongId, setShowSongComplete, onSongComplete]);

  const backToLib = useCallback(() => {
    setShowSongComplete(false);
    exitSong();
  }, [setShowSongComplete, exitSong]);

  const selectSong = useCallback(
    (id: string) => {
      setSelectedSongId(id);
      setViewMode('song-practice');
    },
    [setSelectedSongId, setViewMode]
  );

  const retrySong = useCallback(() => {
    setShowSongComplete(false);
  }, [setShowSongComplete]);

  if (viewMode === 'library') {
    return <SongLibrary onSongSelect={selectSong} />;
  }

  if (viewMode === 'song-practice' && selectedSongId) {
    return (
      <SongPracticeSection
        songId={selectedSongId}
        showComplete={showSongComplete}
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
    />
  );
};
