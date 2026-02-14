import { Song } from '../data/songs';
import { Note } from '../types';

export const loadSongToQueue = (song: Song, queueSize: number = 20): Note[] => {
  // Take the first queueSize notes from the song
  return song.notes.slice(0, queueSize);
};

export const calculateSongProgress = (currentIndex: number, totalNotes: number): number => {
  if (totalNotes === 0) return 0;
  return Math.round((currentIndex / totalNotes) * 100);
};

export const calculateSongAccuracy = (correctNotes: number, totalAttempts: number): number => {
  if (totalAttempts === 0) return 0;
  return Math.round((correctNotes / totalAttempts) * 100);
};

export const formatSongTime = (startTime: number | null): string => {
  if (!startTime) return '0:00';
  const elapsed = Date.now() - startTime;
  const seconds = Math.floor(elapsed / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};
