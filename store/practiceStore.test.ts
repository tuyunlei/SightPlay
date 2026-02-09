import { act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';

import { ClefType } from '../types';

import { usePracticeStore } from './practiceStore';

describe('practiceStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    act(() => {
      usePracticeStore.setState({
        clef: ClefType.TREBLE,
        practiceRange: 'combined',
        isListening: false,
        isMidiConnected: false,
        noteQueue: [],
        exitingNotes: [],
        detectedNote: null,
        status: 'waiting',
        score: 0,
        streak: 0,
        sessionStats: { totalAttempts: 0, cleanHits: 0, bpm: 0 },
        challengeSequence: [],
        challengeIndex: 0,
        challengeInfo: null,
      });
    });
  });

  describe('initial state', () => {
    it('has correct defaults', () => {
      const state = usePracticeStore.getState();
      expect(state.clef).toBe(ClefType.TREBLE);
      expect(state.practiceRange).toBe('combined');
      expect(state.isListening).toBe(false);
      expect(state.isMidiConnected).toBe(false);
      expect(state.noteQueue).toEqual([]);
      expect(state.status).toBe('waiting');
      expect(state.score).toBe(0);
      expect(state.streak).toBe(0);
      expect(state.challengeIndex).toBe(0);
      expect(state.challengeInfo).toBeNull();
    });

    it('has zeroed session stats', () => {
      const { sessionStats } = usePracticeStore.getState();
      expect(sessionStats).toEqual({ totalAttempts: 0, cleanHits: 0, bpm: 0 });
    });
  });

  describe('setters', () => {
    it('setClef updates clef', () => {
      act(() => usePracticeStore.getState().setClef(ClefType.BASS));
      expect(usePracticeStore.getState().clef).toBe(ClefType.BASS);
    });

    it('setPracticeRange updates practice range', () => {
      act(() => usePracticeStore.getState().setPracticeRange('central'));
      expect(usePracticeStore.getState().practiceRange).toBe('central');
    });

    it('setIsListening updates listening state', () => {
      act(() => usePracticeStore.getState().setIsListening(true));
      expect(usePracticeStore.getState().isListening).toBe(true);
    });

    it('setIsMidiConnected updates MIDI connection state', () => {
      act(() => usePracticeStore.getState().setIsMidiConnected(true));
      expect(usePracticeStore.getState().isMidiConnected).toBe(true);
    });

    it('setStatus updates practice status', () => {
      act(() => usePracticeStore.getState().setStatus('correct'));
      expect(usePracticeStore.getState().status).toBe('correct');
    });

    it('setScore updates score', () => {
      act(() => usePracticeStore.getState().setScore(42));
      expect(usePracticeStore.getState().score).toBe(42);
    });

    it('setStreak updates streak', () => {
      act(() => usePracticeStore.getState().setStreak(5));
      expect(usePracticeStore.getState().streak).toBe(5);
    });

    it('setDetectedNote updates detected note', () => {
      const note = {
        id: '1',
        name: 'C' as const,
        octave: 4,
        frequency: 261.63,
        midi: 60,
        globalIndex: 0,
      };
      act(() => usePracticeStore.getState().setDetectedNote(note));
      expect(usePracticeStore.getState().detectedNote).toEqual(note);
    });

    it('setChallengeIndex updates challenge index', () => {
      act(() => usePracticeStore.getState().setChallengeIndex(3));
      expect(usePracticeStore.getState().challengeIndex).toBe(3);
    });
  });

  describe('resetStats', () => {
    it('resets score, streak, and sessionStats to initial values', () => {
      // Set some non-zero values first
      act(() => {
        const state = usePracticeStore.getState();
        state.setScore(100);
        state.setStreak(10);
        state.setSessionStats({ totalAttempts: 50, cleanHits: 40, bpm: 120 });
      });

      // Verify they were set
      expect(usePracticeStore.getState().score).toBe(100);
      expect(usePracticeStore.getState().streak).toBe(10);

      // Reset
      act(() => usePracticeStore.getState().resetStats());

      // Verify reset
      expect(usePracticeStore.getState().score).toBe(0);
      expect(usePracticeStore.getState().streak).toBe(0);
      expect(usePracticeStore.getState().sessionStats).toEqual({
        totalAttempts: 0,
        cleanHits: 0,
        bpm: 0,
      });
    });

    it('does not reset other state like clef or noteQueue', () => {
      const note = {
        id: '1',
        name: 'C' as const,
        octave: 4,
        frequency: 261.63,
        midi: 60,
        globalIndex: 0,
      };
      act(() => {
        const state = usePracticeStore.getState();
        state.setClef(ClefType.BASS);
        state.setNoteQueue([note]);
        state.setScore(50);
      });

      act(() => usePracticeStore.getState().resetStats());

      // Score reset, but clef and noteQueue preserved
      expect(usePracticeStore.getState().score).toBe(0);
      expect(usePracticeStore.getState().clef).toBe(ClefType.BASS);
      expect(usePracticeStore.getState().noteQueue).toEqual([note]);
    });
  });
});
