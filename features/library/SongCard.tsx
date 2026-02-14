import React from 'react';

import { SongMetadata } from '../../data/songs';
import { useLanguage } from '../../hooks/useLanguage';

interface SongCardProps {
  song: SongMetadata;
  onSelect: () => void;
}

const difficultyColors = {
  beginner: 'bg-green-100 text-green-800 border-green-300',
  intermediate: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  advanced: 'bg-red-100 text-red-800 border-red-300',
};

export const SongCard: React.FC<SongCardProps> = ({ song, onSelect }) => {
  const { t } = useLanguage();

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
  };

  const difficultyKey = `difficulty_${song.difficulty}` as keyof typeof t;
  const categoryKey = `category_${song.category}` as keyof typeof t;

  return (
    <div
      onClick={onSelect}
      className="p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-400 hover:shadow-md transition-all cursor-pointer"
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-lg font-semibold text-gray-900">{song.title}</h3>
        <span
          className={`px-2 py-1 text-xs font-semibold rounded border ${difficultyColors[song.difficulty]}`}
        >
          {t[difficultyKey]}
        </span>
      </div>
      <div className="flex gap-3 text-sm text-gray-600">
        <span>
          {t.clef}: {song.clef === 'treble' ? t.trebleClef : t.bassClef}
        </span>
        <span>•</span>
        <span>
          {song.timeSignature.beats}/{song.timeSignature.beatUnit}
        </span>
        <span>•</span>
        <span>
          {song.noteCount} {t.notes}
        </span>
        <span>•</span>
        <span>{formatDuration(song.estimatedDuration)}</span>
      </div>
      <div className="mt-2">
        <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
          {t[categoryKey]}
        </span>
      </div>
    </div>
  );
};
