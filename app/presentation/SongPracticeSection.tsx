import React from 'react';

import type { GuidanceRecommendation } from '@sightplay/guidance';
import { usePractice } from '@sightplay/practice';

import { getSongById } from '../../data/songs';
import { SongComplete } from '../../features/library/SongComplete';
import { SongPractice } from '../../features/library/SongPractice';
import { RecommendationPanel } from '../../features/recommendations/RecommendationPanel';
import { translations } from '../../i18n';

type Props = {
  songId: string;
  recommendations: readonly GuidanceRecommendation[];
  t: typeof translations.en;
  onExit: () => void;
  onRetry: () => void;
  onBackToLibrary: () => void;
  onApplyRec: (id: string) => void;
  onDismissRec: (id: string) => void;
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
        >
          <RecommendationPanel
            recommendations={recommendations}
            t={t}
            onApply={onApplyRec}
            onDismiss={onDismissRec}
          />
        </SongComplete>
      )}
    </>
  );
};
