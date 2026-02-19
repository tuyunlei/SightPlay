import React, { useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/shallow';

import { getSongById } from '../../data/songs';
import { computeAccuracy } from '../../domain/scoring';
import { loadSongToQueue, calculateSongProgress, formatSongTime } from '../../domain/song';
import { useLanguage } from '../../hooks/useLanguage';
import { usePracticeStore } from '../../store/practiceStore';
import PracticeArea from '../practice/PracticeArea';

interface SongPracticeProps {
  songId: string;
  onExit: () => void;
  onComplete: () => void;
}

const SongHeader: React.FC<{
  title: string;
  progress: number;
  accuracy: number;
  timeElapsed: string;
  onExit: () => void;
  t: ReturnType<typeof useLanguage>['t'];
}> = ({ title, progress, accuracy, timeElapsed, onExit, t }) => (
  <div className="bg-white dark:bg-slate-900 border-b-2 border-gray-200 dark:border-slate-700 p-4 mb-4">
    <div className="max-w-4xl mx-auto flex justify-between items-center">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{title}</h2>
        <div className="flex gap-4 mt-2 text-sm text-gray-600 dark:text-slate-300">
          <span>
            {t.progress}: {progress}%
          </span>
          <span>•</span>
          <span>
            {t.accuracy}: {accuracy}%
          </span>
          <span>•</span>
          <span>
            {t.time}: {timeElapsed}
          </span>
        </div>
      </div>
      <button
        onClick={onExit}
        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-100"
      >
        {t.exitSong}
      </button>
    </div>

    <div className="max-w-4xl mx-auto mt-4">
      <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
        <div
          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  </div>
);

const useSongInitialization = (
  songId: string,
  song: ReturnType<typeof getSongById>,
  onComplete: () => void
) => {
  const {
    songProgress,
    songTotalNotes,
    songStartTime,
    sessionStats,
    setCurrentSongId,
    setSongProgress,
    setSongTotalNotes,
    setSongStartTime,
    setNoteQueue,
    setChallengeSequence,
    setChallengeIndex,
    setPracticeMode,
    setClef,
    resetStats,
  } = usePracticeStore();

  useEffect(() => {
    if (!song) return;

    setPracticeMode('song');
    setCurrentSongId(songId);
    setSongTotalNotes(song.notes.length);
    setSongProgress(0);
    setSongStartTime(Date.now());
    setClef(song.clef);
    resetStats();
    setChallengeSequence(song.notes);
    setChallengeIndex(0);
    setNoteQueue(loadSongToQueue(song, 20));

    return () => {
      setPracticeMode('random');
      setCurrentSongId(null);
      setChallengeSequence([]);
      setChallengeIndex(0);
    };
  }, [
    song,
    songId,
    setPracticeMode,
    setCurrentSongId,
    setSongTotalNotes,
    setSongProgress,
    setSongStartTime,
    setClef,
    resetStats,
    setChallengeSequence,
    setChallengeIndex,
    setNoteQueue,
  ]);

  useEffect(() => {
    const { challengeIndex } = usePracticeStore.getState();
    if (songTotalNotes > 0) {
      const progress = calculateSongProgress(challengeIndex, songTotalNotes);
      setSongProgress(progress);

      if (challengeIndex >= songTotalNotes) {
        setTimeout(() => onComplete(), 1000);
      }
    }
  }, [sessionStats.totalAttempts, songTotalNotes, setSongProgress, onComplete]);

  return { songProgress, songStartTime, sessionStats };
};

export const SongPractice: React.FC<SongPracticeProps> = ({ songId, onExit, onComplete }) => {
  const { t } = useLanguage();
  const song = useMemo(() => getSongById(songId), [songId]);
  const { songProgress, songStartTime, sessionStats } = useSongInitialization(
    songId,
    song,
    onComplete
  );

  // Get practice state for PracticeArea
  const practiceState = usePracticeStore(
    useShallow((state) => ({
      clef: state.clef,
      practiceRange: state.practiceRange,
      handMode: state.handMode,
      noteQueue: state.noteQueue,
      exitingNotes: state.exitingNotes,
      detectedNote: state.detectedNote,
      status: state.status,
      challengeSequence: state.challengeSequence,
      challengeIndex: state.challengeIndex,
      challengeInfo: state.challengeInfo,
      isMidiConnected: state.isMidiConnected,
      setPracticeRange: state.setPracticeRange,
      setHandMode: state.setHandMode,
    }))
  );

  const accuracy = useMemo(() => computeAccuracy(sessionStats), [sessionStats]);
  const timeElapsed = formatSongTime(songStartTime);
  const targetNote = practiceState.noteQueue.length > 0 ? practiceState.noteQueue[0] : null;

  if (!song) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 dark:text-red-400">{t.songNotFound}</p>
        <button onClick={onExit} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded">
          {t.backToLibrary}
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <SongHeader
        title={song.title}
        progress={songProgress}
        accuracy={accuracy}
        timeElapsed={timeElapsed}
        onExit={onExit}
        t={t}
      />
      <PracticeArea
        clef={practiceState.clef}
        practiceRange={practiceState.practiceRange}
        handMode={practiceState.handMode}
        noteQueue={practiceState.noteQueue}
        exitingNotes={practiceState.exitingNotes}
        detectedNote={practiceState.detectedNote}
        status={practiceState.status}
        targetNote={targetNote}
        pressedKeys={new Map()}
        challengeSequence={practiceState.challengeSequence}
        challengeIndex={practiceState.challengeIndex}
        challengeInfo={practiceState.challengeInfo}
        t={t}
        isMidiConnected={practiceState.isMidiConnected}
        onPracticeRangeChange={practiceState.setPracticeRange}
        onHandModeChange={practiceState.setHandMode}
      />
    </div>
  );
};
