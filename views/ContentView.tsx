import React from 'react';

import { ViewMode } from '../components/navigation/NavigationTabs';
import { getSongById } from '../data/songs';
import { computeAccuracy } from '../domain/scoring';
import { SongComplete } from '../features/library/SongComplete';
import { SongLibrary } from '../features/library/SongLibrary';
import { SongPractice } from '../features/library/SongPractice';
import { usePracticeSession } from '../hooks/usePracticeSession';
import { Language, translations } from '../i18n';
import { usePracticeStore } from '../store/practiceStore';

import { RandomPracticeView } from './RandomPracticeView';

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
  chatHistory: Array<{ role: 'user' | 'ai'; text: string; hasAction?: boolean }>;
  isLoadingAi: boolean;
  sendMessage: (message: string) => void;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
  lang: Language;
};

export const ContentView: React.FC<ContentViewProps> = ({
  viewMode,
  selectedSongId,
  showSongComplete,
  setSelectedSongId,
  setViewMode,
  setShowSongComplete,
  state,
  derived,
  actions,
  pressedKeys,
  t,
  toggleLang,
  chatInput,
  setChatInput,
  chatHistory,
  isLoadingAi,
  sendMessage,
  chatEndRef,
  lang,
}) => {
  const sessionStats = usePracticeStore((s) => s.sessionStats);
  const songStartTime = usePracticeStore((s) => s.songStartTime);

  if (viewMode === 'library') {
    return (
      <SongLibrary
        onSongSelect={(songId) => {
          setSelectedSongId(songId);
          setViewMode('song-practice');
        }}
      />
    );
  }

  if (viewMode === 'song-practice' && selectedSongId) {
    return (
      <>
        <SongPractice
          songId={selectedSongId}
          onExit={() => {
            setViewMode('library');
            setSelectedSongId(null);
          }}
          onComplete={() => setShowSongComplete(true)}
        />
        {showSongComplete && (
          <SongComplete
            songTitle={getSongById(selectedSongId)?.title || ''}
            accuracy={computeAccuracy(sessionStats)}
            totalAttempts={sessionStats.totalAttempts}
            correctNotes={sessionStats.cleanHits}
            timeElapsed={songStartTime}
            onRetry={() => setShowSongComplete(false)}
            onBackToLibrary={() => {
              setShowSongComplete(false);
              setViewMode('library');
              setSelectedSongId(null);
            }}
          />
        )}
      </>
    );
  }

  return (
    <RandomPracticeView
      state={state}
      derived={derived}
      actions={actions}
      pressedKeys={pressedKeys}
      t={t}
      toggleLang={toggleLang}
      chatInput={chatInput}
      setChatInput={setChatInput}
      chatHistory={chatHistory}
      isLoadingAi={isLoadingAi}
      sendMessage={sendMessage}
      chatEndRef={chatEndRef}
      lang={lang}
    />
  );
};
