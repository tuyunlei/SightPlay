import { useCallback, useEffect, useRef, useState } from 'react';

import { translations, Language } from '../i18n';
import { chatWithAiCoach } from '../services/geminiService';
import { NoteName } from '../types';

import { createMistakeTracker, MistakePattern } from './useMistakeTracker';

const RATE_LIMIT_MS = 30_000;
const HINT_DISPLAY_MS = 5_000;
const MISTAKE_THRESHOLD = 3;
const STREAK_THRESHOLD = 5;

export interface MistakeInfo {
  expected?: NoteName;
  played?: NoteName;
}

export interface Hint {
  id: number;
  text: string;
  type: 'encouragement' | 'tip';
}

const getLocalHints = (t: typeof translations.en) => ({
  encouragement: [t.hintGreatStreak, t.hintAwesome],
  tip: [t.hintTrySlower, t.hintKeepGoing, t.hintPracticeRange],
});

function getPatternHint(pattern: MistakePattern, t: typeof translations.en): string | null {
  switch (pattern.kind) {
    case 'accidentals':
      return t.hintAccidentals;
    case 'adjacent':
      return t.hintAdjacentNotes;
    case 'note-pair':
      return t.hintNotePairConfusion
        .replace('{noteA}', pattern.noteA)
        .replace('{noteB}', pattern.noteB);
    default:
      return null;
  }
}

function buildAiContext(pattern: MistakePattern | null): string {
  if (!pattern) return 'is struggling with mistakes';
  switch (pattern.kind) {
    case 'accidentals':
      return 'keeps confusing sharps and flats';
    case 'adjacent':
      return 'keeps mixing up adjacent notes on the staff';
    case 'note-pair':
      return `keeps confusing ${pattern.noteA} and ${pattern.noteB}`;
  }
}

export const useContextualHints = (lang: Language, clef: string) => {
  const [currentHint, setCurrentHint] = useState<Hint | null>(null);
  const lastHintTime = useRef(0);
  const hintIdCounter = useRef(0);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const prevStreak = useRef(0);
  const consecutiveMistakes = useRef(0);
  const trackerRef = useRef(createMistakeTracker());
  const t = translations[lang];

  const showHint = useCallback((text: string, type: Hint['type']) => {
    const now = Date.now();
    if (now - lastHintTime.current < RATE_LIMIT_MS) return;
    lastHintTime.current = now;

    const id = ++hintIdCounter.current;
    setCurrentHint({ id, text, type });

    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    dismissTimer.current = setTimeout(() => setCurrentHint(null), HINT_DISPLAY_MS);
  }, []);

  const dismissHint = useCallback(() => {
    setCurrentHint(null);
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
  }, []);

  const showLocalHint = useCallback(
    (type: Hint['type']) => {
      const hints = getLocalHints(t);
      const pool = hints[type];
      const text = pool[Math.floor(Math.random() * pool.length)];
      showHint(text, type);
    },
    [showHint, t]
  );

  const fetchAiHint = useCallback(
    async (context: string, type: Hint['type']) => {
      try {
        const prompt = `Give a very brief (under 15 words) ${type === 'encouragement' ? 'encouraging' : 'helpful tip'} message for a piano student who ${context}. Be warm and concise.`;
        const response = await chatWithAiCoach(prompt, clef, lang);
        if (response.replyText) {
          showHint(response.replyText, type);
          return;
        }
      } catch {
        // fall through to local
      }
      showLocalHint(type);
    },
    [clef, lang, showHint, showLocalHint]
  );

  const handleMistakeThreshold = useCallback(() => {
    const pattern = trackerRef.current.detectPatterns();
    const patternHint = pattern ? getPatternHint(pattern, t) : null;
    if (patternHint) showHint(patternHint, 'tip');
    else void fetchAiHint(buildAiContext(pattern), 'tip');
  }, [fetchAiHint, showHint, t]);

  const onPracticeUpdate = useCallback(
    (streak: number, mistakeInfo: MistakeInfo | null) => {
      if (mistakeInfo) {
        if (mistakeInfo.expected && mistakeInfo.played)
          trackerRef.current.addMistake(mistakeInfo.expected, mistakeInfo.played);
        consecutiveMistakes.current += 1;
        if (consecutiveMistakes.current >= MISTAKE_THRESHOLD) {
          consecutiveMistakes.current = 0;
          handleMistakeThreshold();
        }
      }

      if (streak > prevStreak.current && streak > 0 && streak % STREAK_THRESHOLD === 0) {
        consecutiveMistakes.current = 0;
        void fetchAiHint(`has a ${streak}-note streak`, 'encouragement');
      }

      if (streak < prevStreak.current) consecutiveMistakes.current += 1;
      prevStreak.current = streak;
    },
    [fetchAiHint, handleMistakeThreshold]
  );

  useEffect(() => {
    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, []);

  return { currentHint, dismissHint, onPracticeUpdate, tracker: trackerRef.current };
};
