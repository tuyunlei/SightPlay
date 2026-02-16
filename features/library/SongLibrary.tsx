import React, { useMemo, useState } from 'react';

import { SONG_LIBRARY, SongDifficulty, SongMetadata } from '../../data/songs';
import { useLanguage } from '../../hooks/useLanguage';

import { SongCard } from './SongCard';

interface SongLibraryProps {
  onSongSelect: (songId: string) => void;
}

const estimateDuration = (noteCount: number): number => {
  // Rough estimate: 2 notes per second for beginners
  return Math.ceil(noteCount / 2);
};

const convertToMetadata = (song: (typeof SONG_LIBRARY)[number]): SongMetadata & { id: string } => ({
  id: song.id,
  title: song.title,
  difficulty: song.difficulty,
  category: song.category,
  clef: song.clef,
  timeSignature: song.timeSignature,
  noteCount: song.notes.length,
  estimatedDuration: estimateDuration(song.notes.length),
});

export const SongLibrary: React.FC<SongLibraryProps> = ({ onSongSelect }) => {
  const { t } = useLanguage();
  const [difficultyFilter, setDifficultyFilter] = useState<SongDifficulty | 'all'>('all');

  const songs = useMemo(() => SONG_LIBRARY.map(convertToMetadata), []);

  const filteredSongs = useMemo(() => {
    if (difficultyFilter === 'all') return songs;
    return songs.filter((song) => song.difficulty === difficultyFilter);
  }, [songs, difficultyFilter]);

  const groupedByDifficulty = useMemo(() => {
    const groups: Record<SongDifficulty, typeof songs> = {
      beginner: [],
      intermediate: [],
      advanced: [],
    };
    filteredSongs.forEach((song) => {
      groups[song.difficulty].push(song);
    });
    return groups;
  }, [filteredSongs]);

  const difficulties: (SongDifficulty | 'all')[] = ['all', 'beginner', 'intermediate', 'advanced'];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-slate-100">{t.songLibrary}</h1>

      {/* Difficulty Filter */}
      <div className="mb-6 flex gap-2 flex-wrap">
        {difficulties.map((diff) => {
          const label =
            diff === 'all' ? t.allDifficulties : t[`difficulty_${diff}` as keyof typeof t];
          return (
            <button
              key={diff}
              onClick={() => setDifficultyFilter(diff)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                difficultyFilter === diff
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Song List */}
      {difficultyFilter === 'all' ? (
        // Grouped by difficulty
        <>
          {(['beginner', 'intermediate', 'advanced'] as SongDifficulty[]).map((difficulty) => {
            const songsInGroup = groupedByDifficulty[difficulty];
            if (songsInGroup.length === 0) return null;

            return (
              <div key={difficulty} className="mb-8">
                <h2 className="text-xl font-semibold mb-3 text-gray-800 dark:text-slate-200">
                  {t[`difficulty_${difficulty}` as keyof typeof t]}
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {songsInGroup.map((song) => (
                    <SongCard key={song.id} song={song} onSelect={() => onSongSelect(song.id)} />
                  ))}
                </div>
              </div>
            );
          })}
        </>
      ) : (
        // Filtered view
        <div className="grid gap-4 md:grid-cols-2">
          {filteredSongs.map((song) => (
            <SongCard key={song.id} song={song} onSelect={() => onSongSelect(song.id)} />
          ))}
        </div>
      )}

      {filteredSongs.length === 0 && (
        <div className="text-center py-12 text-gray-500 dark:text-slate-400">{t.noSongsFound}</div>
      )}
    </div>
  );
};
