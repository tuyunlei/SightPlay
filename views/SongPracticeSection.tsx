import React from 'react';

import { getSongById } from '../data/songs';
import type { Recommendation } from '../domain/recommendations';
import { computeAccuracy } from '../domain/scoring';
import { SongComplete } from '../features/library/SongComplete';
import { SongPractice } from '../features/library/SongPractice';
import { RecommendationPanel } from '../features/recommendations/RecommendationPanel';
import { translations } from '../i18n';
import { usePracticeStore } from '../store/practiceStore';

type Props = {
  songId: string;
  showComplete: boolean;
  recommendations: Recommendation[];
  t: typeof translations.en;
  onExit: () => void;
  onComplete: () => void;
  onRetry: () => void;
  onBackToLibrary: () => void;
  onApplyRec: (rec: Recommendation) => void;
  onDismissRec: () => void;
};

export const SongPracticeSection: React.FC<Props> = ({
  songId,
  showComplete,
  recommendations,
  t,
  onExit,
  onComplete,
  onRetry,
  onBackToLibrary,
  onApplyRec,
  onDismissRec,
}) => {
  const sessionStats = usePracticeStore((s) => s.sessionStats);
  const songStartTime = usePracticeStore((s) => s.songStartTime);

  return (
    <>
      <SongPractice songId={songId} onExit={onExit} onComplete={onComplete} />
      {showComplete && (
        <SongComplete
          songTitle={getSongById(songId)?.title || ''}
          accuracy={computeAccuracy(sessionStats)}
          totalAttempts={sessionStats.totalAttempts}
          correctNotes={sessionStats.cleanHits}
          timeElapsed={songStartTime}
          onRetry={onRetry}
          onBackToLibrary={onBackToLibrary}
        />
      )}
      {showComplete && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4">
          <RecommendationPanel
            recommendations={recommendations}
            t={t}
            onApply={onApplyRec}
            onDismiss={onDismissRec}
          />
        </div>
      )}
    </>
  );
};
