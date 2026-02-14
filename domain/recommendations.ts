import { SongDifficulty } from '../data/songs/types';
import { ClefType, PracticeRangeMode } from '../types';

export type RecommendationType = 'practiceRange' | 'song' | 'clef' | 'general';

export interface Recommendation {
  id: string;
  type: RecommendationType;
  titleKey: string;
  descriptionKey: string;
  action?: RecommendationAction;
}

export type RecommendationAction =
  | { kind: 'setClef'; clef: ClefType }
  | { kind: 'setPracticeRange'; range: PracticeRangeMode }
  | { kind: 'navigateSong'; songId: string }
  | { kind: 'navigateDifficulty'; difficulty: SongDifficulty };

export interface PracticeSnapshot {
  totalAttempts: number;
  cleanHits: number;
  currentClef: ClefType;
  currentRange: PracticeRangeMode;
  practiceMode: 'random' | 'song';
  completedSongDifficulty?: SongDifficulty;
}

const MIN_ATTEMPTS = 20;

export function computeAccuracyPct(s: PracticeSnapshot): number {
  if (s.totalAttempts === 0) return 100;
  return Math.round((s.cleanHits / s.totalAttempts) * 100);
}

export function generateRecommendations(snapshot: PracticeSnapshot): Recommendation[] {
  const recs: Recommendation[] = [];
  const acc = computeAccuracyPct(snapshot);

  if (snapshot.practiceMode === 'song' && snapshot.completedSongDifficulty) {
    recs.push(...songCompleteRecs(snapshot.completedSongDifficulty));
  }

  if (snapshot.practiceMode === 'random' && snapshot.totalAttempts >= MIN_ATTEMPTS) {
    recs.push(...randomPracticeRecs(acc, snapshot));
  }

  return recs.slice(0, 2);
}

function songCompleteRecs(difficulty: SongDifficulty): Recommendation[] {
  const recs: Recommendation[] = [];
  const nextMap: Record<string, SongDifficulty | undefined> = {
    beginner: 'intermediate',
    intermediate: 'advanced',
  };
  const next = nextMap[difficulty];
  if (next) {
    recs.push({
      id: `song-next-${next}`,
      type: 'song',
      titleKey: 'recTryHarderSongTitle',
      descriptionKey: `recTryHarderSongDesc_${next}`,
      action: { kind: 'navigateDifficulty', difficulty: next },
    });
  }
  recs.push({
    id: 'general-keep-going',
    type: 'general',
    titleKey: 'recKeepPracticingTitle',
    descriptionKey: 'recKeepPracticingDesc',
  });
  return recs;
}

function randomPracticeRecs(acc: number, snapshot: PracticeSnapshot): Recommendation[] {
  const recs: Recommendation[] = [];

  if (acc > 90) {
    if (snapshot.currentClef === ClefType.TREBLE) {
      recs.push({
        id: 'clef-try-bass',
        type: 'clef',
        titleKey: 'recTryBassTitle',
        descriptionKey: 'recTryBassDesc',
        action: { kind: 'setClef', clef: ClefType.BASS },
      });
    }
    if (snapshot.currentRange === 'central') {
      recs.push({
        id: 'range-expand',
        type: 'practiceRange',
        titleKey: 'recExpandRangeTitle',
        descriptionKey: 'recExpandRangeDesc',
        action: { kind: 'setPracticeRange', range: 'combined' },
      });
    }
    recs.push({
      id: 'song-suggestion',
      type: 'song',
      titleKey: 'recTrySongTitle',
      descriptionKey: 'recTrySongDesc',
      action: { kind: 'navigateDifficulty', difficulty: 'intermediate' },
    });
  }

  if (acc < 50) {
    if (snapshot.currentRange !== 'central') {
      recs.push({
        id: 'range-narrow',
        type: 'practiceRange',
        titleKey: 'recNarrowRangeTitle',
        descriptionKey: 'recNarrowRangeDesc',
        action: { kind: 'setPracticeRange', range: 'central' },
      });
    }
    recs.push({
      id: 'general-slow-down',
      type: 'general',
      titleKey: 'recSlowDownTitle',
      descriptionKey: 'recSlowDownDesc',
    });
  }

  return recs;
}
