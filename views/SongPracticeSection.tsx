import React from 'react';

import { usePractice } from '@sightplay/practice';

import { getSongById } from '../data/songs';
import type { Recommendation } from '../domain/recommendations';
import { SongComplete } from '../features/library/SongComplete';
import { SongPractice } from '../features/library/SongPractice';
import { RecommendationPanel } from '../features/recommendations/RecommendationPanel';
import { translations } from '../i18n';

type Props = {
  songId: string;
  recommendations: Recommendation[];
  t: typeof translations.en;
  onExit: () => void;
  onRetry: () => void;
  onBackToLibrary: () => void;
  onApplyRec: (rec: Recommendation) => void;
  onDismissRec: () => void;
};

export const SongPracticeSection: React.FC<Props> = ({
  songId,
  recommendations,
  t,
  onExit,
  onRetry,
  onBackToLibrary,
  onApplyRec,
  onDismissRec,
}) => {
  const { view } = usePractice();
  const showComplete =
    view.source === 'song' && view.metadata.id === songId && view.completion.kind === 'completed';

  return (
    <>
      <SongPractice songId={songId} onExit={onExit} />
      {showComplete && (
        <SongComplete
          songTitle={getSongById(songId)?.title || ''}
          accuracy={view.accuracy}
          totalAttempts={view.sessionStats.totalAttempts}
          correctNotes={view.sessionStats.cleanHits}
          elapsedMs={view.elapsedMs}
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
